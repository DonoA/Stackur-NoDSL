import { CloudFormation } from 'aws-sdk';

export interface CFResource {
    Type: string;
    Properties: any;
};

export interface CFTemplate {
    AWSTemplateFormatVersion: string;
    // Poor man's map from strings to resources
    // this is done for easy serialization
    Resources: { [id: string]: CFResource };
};

export class CFEngine {
    private stackName: string;
    private client: CloudFormation;

    private localTemplate: CFTemplate;
    private remoteTemplate?: CFTemplate;
    private isSetup: boolean = false;
    private stackExists: boolean = false;

    constructor(stackName: string) {
        this.stackName = stackName;
        this.client = new CloudFormation();

        this.localTemplate = {
            AWSTemplateFormatVersion: "2010-09-09",
            Resources: {}
        };
    }

    async setup() {
        if (this.isSetup) {
            return;
        }
        this.isSetup = true;

        // Check if remote stack exists
        try {
            await this.client.describeStacks({
                StackName: this.stackName
            }).promise();
            this.stackExists = true;
        } catch (ex) {
            if (ex.message.includes('does not exist')) {
                this.stackExists = false;
            } else {
                throw ex;
            }
        }

        // if remote stack exists, fetch the template so we can build diff against it
        await this.getRemoteTemplate();
    }

    private async getRemoteTemplate(): Promise<CFTemplate | undefined> {
        if (!this.stackExists) {
            return undefined;
        }

        const template = await this.client.getTemplate({
            StackName: this.stackName
        }).promise();
        if (template.TemplateBody) {
            this.remoteTemplate = JSON.parse(template.TemplateBody);
        } else {
            this.remoteTemplate = undefined;
        }

        return this.remoteTemplate;
    }

    async addResource(name: string, resource: CFResource) {
        await this.setup();

        this.localTemplate.Resources[name] = resource;
    }

    private async getEvents(): Promise<CloudFormation.StackEvent[]> {
        const res = await this.client.describeStackEvents({
            StackName: this.stackName
        }).promise();

        return res.StackEvents || [];
    }

    private async watchNewEvents<T>(callback: (event: CloudFormation.StackEvent) => Promise<T>) {
        let eventCount = (await this.getEvents()).length;
        return new Promise((res, rej) => {
            const itervalId = setInterval(() => {
                this.getEvents().then(async (events) => {
                    const newEvents = events.length - eventCount;
                    for (let index = 0; index < newEvents; index++) {
                        const rtn = await callback(events[newEvents - index - 1]);
                        if (rtn !== undefined) {
                            clearInterval(itervalId);
                            res(rtn);
                        }
                    }
                    eventCount = events.length;
                });
            }, 5 * 1000);
        });
    }

    async commit() {
        const changeSetName = `${process.env.USER}-${new Date().getTime()}`;
        
        const changeSet = await this.createChangeSet(changeSetName);

        // do nothing if we can
        if (changeSet.StatusReason?.includes('didn\'t contain changes.')) {
            console.log('no changes required!');
            return;
        }

        // check that we can execute this change set
        if (changeSet.ExecutionStatus !== 'AVAILABLE') {
            throw new Error(`Bad changeset ${changeSet.Status} - ${changeSet.StatusReason}`);
        }

        console.log(changeSet);
        changeSet.Changes?.forEach((change) => {
            console.log(JSON.stringify(change, undefined, 2));
        });

        await this.executeChangeSet(changeSetName);

        this.stackExists = true;
        await this.getRemoteTemplate();
    }

    private async createChangeSet(changeSetName: string): Promise<CloudFormation.DescribeChangeSetOutput> {
        const changeSetSettings = {
            StackName: this.stackName,
            ChangeSetName: changeSetName,
            ChangeSetType: 'UPDATE',
            TemplateBody: this.generateCF(),
        };

        if (!this.stackExists) {
            changeSetSettings.ChangeSetType = 'CREATE';
        }

        await this.client.createChangeSet(
            changeSetSettings
        ).promise();

        // Wait for change set to be ready
        return await new Promise((res, rej) => {
            const awaitRes = [
                "CREATE_COMPLETE",
                "DELETE_COMPLETE",
                "FAILED"
            ];

            const intervalId = setInterval(() => {
                this.client.describeChangeSet({
                    StackName: this.stackName,
                    ChangeSetName: changeSetName,
                }).promise().then((changeSetDesc) => {
                    if (awaitRes.includes(changeSetDesc.Status || "")) {
                        clearInterval(intervalId);
                        res(changeSetDesc);
                    }
                });
            }, 5 * 1000);
        });
    }

    private async executeChangeSet(changeSetName: string) {
        await this.client.executeChangeSet({
            StackName: this.stackName,
            ChangeSetName: changeSetName,
        }).promise();

        await this.watchNewEvents(async (event) => {
            console.log(`${event.ResourceStatus} => ${event.ResourceStatusReason}`);
            console.log(event.ResourceType);
            console.log(event.ResourceProperties);

            if (event.ResourceStatus === 'ROLLBACK_COMPLETE') {
                return true;
            }
            if (event.ResourceStatus === 'CREATE_COMPLETE' && event.ResourceType === 'AWS::CloudFormation::Stack') {
                return true;
            }
            if (event.ResourceStatus === 'UPDATE_COMPLETE' && event.ResourceType === 'AWS::CloudFormation::Stack') {
                return true;
            }
        });
    }

    

    generateCF(): string {
        return JSON.stringify(this.localTemplate);
    }

    dumpCF() {
        console.log('Local:')
        console.log(JSON.stringify(this.localTemplate));

        console.log('Remote:')
        console.log(JSON.stringify(this.remoteTemplate));
    }
}