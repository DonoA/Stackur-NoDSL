import { CloudFormation } from "aws-sdk";
import { Interaction } from "../src/interaction";
export interface CFResource {
    Type: string;
    Properties: any;
}

export interface CFTemplate {
    AWSTemplateFormatVersion: string;
    // Poor man's map from strings to resources
    // this is done for easy serialization
    Resources: { [id: string]: CFResource };
}

/**
 * The CFEngine controls interaction between the public facing
 * interfaces of the library and the aws structures that back
 * them.
 *
 * The CFEngine should be the only object allowed to interact with
 * cloudformation directly. It maintains a template object representing
 * the CloudFormation script that will be created when the resources are
 * constructed. An valid resource can be inserted into the CFEngine and it
 * will be sent to CloudFormation for creation.
 */

// Flag for either allowing user confirmation to the changes or not
let allowUserInteraction = true;

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
            Resources: {},
        };
    }

    /**
     * Initialize the engine with data from any existing stacks
     * with the same name.
     */
    async setup() {
        if (this.isSetup) {
            return;
        }
        this.isSetup = true;

        // Check if remote stack exists
        try {
            await this.client
                .describeStacks({
                    StackName: this.stackName,
                })
                .promise();
            this.stackExists = true;
        } catch (ex) {
            if (ex.message.includes("does not exist")) {
                this.stackExists = false;
            } else {
                throw ex;
            }
        }

        // if remote stack exists, fetch the template so we can build diff against it
        await this.getRemoteTemplate();
    }

    /**
     * Update remoteTemplate with the data already in the CloudFormation stack.
     *
     * Currently the remoteTemplate is not used, however at some point it may
     * be helpful for showing changes.
     */
    private async getRemoteTemplate(): Promise<CFTemplate | undefined> {
        if (!this.stackExists) {
            return undefined;
        }

        const template = await this.client
            .getTemplate({
                StackName: this.stackName,
            })
            .promise();
        if (template.TemplateBody) {
            this.remoteTemplate = JSON.parse(template.TemplateBody);
        } else {
            this.remoteTemplate = undefined;
        }

        return this.remoteTemplate;
    }

    /**
     * Add a resource to the engine. The resource will not be committed until
     * later
     *
     * @param name The resource name to be displayed in the AWS console
     * @param resource The resource object that will be submitted for creation
     */
    async addResource(name: string, resource: CFResource) {
        await this.setup();

        this.localTemplate.Resources[name] = resource;
    }

    /**
     * List all the event this stack has had. Ever.
     */
    private async getEvents(): Promise<CloudFormation.StackEvent[]> {
        const res = await this.client
            .describeStackEvents({
                StackName: this.stackName,
            })
            .promise();

        return res.StackEvents || [];
    }

    /**
     * Calls callback for each new event in the stack. Used for watching updates to
     * stack changes.
     *
     * @param callback function to be called on each new event. If this callback returns
     * `undefined`, the method continues to watch. Any other result will end watching.
     * The object returned by callback will be returned by watchNewEvents.
     *
     * @returns The non-undefined value returned by callback
     */
    private async watchNewEvents<T>(
        callback: (event: CloudFormation.StackEvent) => Promise<T>
    ): Promise<T> {
        let eventCount = (await this.getEvents()).length;
        return new Promise((res, rej) => {
            const itervalId = setInterval(() => {
                this.getEvents().then(async (events) => {
                    const newEvents = events.length - eventCount;
                    for (let index = 0; index < newEvents; index++) {
                        const rtn = await callback(
                            events[newEvents - index - 1]
                        );
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

    /**
     * Sends the stack to AWS.
     *
     * First a change set is created for the new resources. Then the change
     * set is executed if it is acceptable.
     */
    async commit() {
        const changeSetName = `${process.env.USER}-${new Date().getTime()}`;

        const changeSet = await this.createChangeSet(changeSetName);
        // let thing = typeof changeSet;
        // console.log(thing);
        // do nothing if we can
        if (changeSet.StatusReason?.includes("didn't contain changes.")) {
            console.log("no changes required!");
            return;
        }

        // check that we can execute this change set
        if (changeSet.ExecutionStatus !== "AVAILABLE") {
            throw new Error(
                `Bad changeset ${changeSet.Status} - ${changeSet.StatusReason}`
            );
        }

        // TODO This is where we want the user to accept or deny the changeset
        // create some class that give the user
        // console.log("CHANGESET");
        // console.log(changeSet);
        let userInteraction = new Interaction();

        if (allowUserInteraction == true) {
            // let allow = true;
            let allow = await userInteraction.confirmChanges(changeSet);
            if (allow == true) {
                await this.executeChangeSet(changeSetName);
                this.stackExists = true;
                await this.getRemoteTemplate();
            } else {
                console.log(
                    "Changes not accepted\nPlease make proper changes and accept to commit"
                );
            }
        } else {
            console.log(changeSet);
            changeSet.Changes?.forEach((change) => {
                console.log(JSON.stringify(change, undefined, 2));
            });

            await this.executeChangeSet(changeSetName);

            this.stackExists = true;
            await this.getRemoteTemplate();
        }
    }

    /**
     * Create a change set from the current localTemplate
     *
     * @param changeSetName .
     */
    private async createChangeSet(
        changeSetName: string
    ): Promise<CloudFormation.DescribeChangeSetOutput> {
        const changeSetSettings = {
            StackName: this.stackName,
            ChangeSetName: changeSetName,
            ChangeSetType: "UPDATE",
            TemplateBody: this.generateCF(),
        };

        if (!this.stackExists) {
            changeSetSettings.ChangeSetType = "CREATE";
        }

        await this.client.createChangeSet(changeSetSettings).promise();

        // Wait for change set to be ready
        return await new Promise((res, rej) => {
            const awaitRes = ["CREATE_COMPLETE", "DELETE_COMPLETE", "FAILED"];

            const intervalId = setInterval(() => {
                this.client
                    .describeChangeSet({
                        StackName: this.stackName,
                        ChangeSetName: changeSetName,
                    })
                    .promise()
                    .then((changeSetDesc) => {
                        if (awaitRes.includes(changeSetDesc.Status || "")) {
                            clearInterval(intervalId);
                            res(changeSetDesc);
                        }
                    });
            }, 5 * 1000);
        });
    }

    /**
     * Execute a change set that has already been created
     * with the same name
     *
     * @param changeSetName change set name
     */
    private async executeChangeSet(changeSetName: string) {
        await this.client
            .executeChangeSet({
                StackName: this.stackName,
                ChangeSetName: changeSetName,
            })
            .promise();

        await this.watchNewEvents(async (event) => {
            console.log(
                `${event.ResourceStatus} => ${event.ResourceStatusReason}`
            );
            console.log(event.ResourceType);
            console.log(event.ResourceProperties);

            if (event.ResourceStatus === "ROLLBACK_COMPLETE") {
                return true;
            }
            if (
                event.ResourceStatus === "CREATE_COMPLETE" &&
                event.ResourceType === "AWS::CloudFormation::Stack"
            ) {
                return true;
            }
            if (
                event.ResourceStatus === "UPDATE_COMPLETE" &&
                event.ResourceType === "AWS::CloudFormation::Stack"
            ) {
                return true;
            }
        });
    }

    /**
     * Build CloudFormation script for this stack
     */
    generateCF(): string {
        return JSON.stringify(this.localTemplate);
    }

    /**
     * print the local and remote templates for viewing
     */
    dumpCF() {
        console.log("Local:");
        console.log(JSON.stringify(this.localTemplate));

        console.log("Remote:");
        console.log(JSON.stringify(this.remoteTemplate));
    }
}
