import AWS from "aws-sdk";
import { Interaction } from "../src/interaction";
import { exit } from "process";
import { Logger, LogLevel } from "./logger";

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

export interface CFEngineProps {
    logger: Logger
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
// let allowUserInteraction = true;

export class CFEngine {
    private stackName: string;
    private client: AWS.CloudFormation;

    private localTemplate: CFTemplate;
    private remoteTemplate?: CFTemplate;
    private isSetup: boolean = false;
    private stackExists: boolean = false;

    private arnMap: Map<string, string> = new Map<string, string>();

    readonly props?: CFEngineProps;
    readonly logger: Logger;

    constructor(stackName: string, props?: CFEngineProps) {
        this.stackName = stackName;
        this.client = new AWS.CloudFormation();
        this.props = props;
        this.logger = this.props?.logger || new Logger(LogLevel.Log);

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
        await this.syncRemoteState();
    }

    /**
     * Update remoteTemplate with the data already in the CloudFormation stack.
     *
     * Currently the remoteTemplate is not used, however at some point it may
     * be helpful for showing changes.
     */
    private async syncRemoteState(): Promise<void> {
        if (!this.stackExists) {
            return;
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

        const remoteResources = await this.client.describeStackResources({
            StackName: this.stackName
        }).promise();

        this.arnMap.clear();
        remoteResources.StackResources?.forEach((resource) => {
            if(!resource.PhysicalResourceId) {
                return;
            }

            this.arnMap.set(resource.LogicalResourceId, resource.PhysicalResourceId);
        });
    }

    getArnFor(resourceName: string): string | undefined {
        return this.arnMap.get(resourceName);
    }

    /**
     * Add a resource to the engine. The resource will not be committed until
     * later
     *
     * @param name The resource name to be displayed in the AWS console
     * @param resource The resource object that will be submitted for creation
     */
    async addResource(name: string, cfResource: CFResource) {
        await this.setup();

        this.localTemplate.Resources[name] = cfResource;
    }

    /**
     * List all the event this stack has had. Ever.
     */
    private async getEvents(): Promise<AWS.CloudFormation.StackEvent[]> {
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
        callback: (event: AWS.CloudFormation.StackEvent) => Promise<T>
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
    async commit(allowUserInteraction: boolean) {
        const changeSetName = `${process.env.USER}-${new Date().getTime()}`;

        const changeSet = await this.createChangeSet(changeSetName);
        // let thing = typeof changeSet;
        // console.log(thing);
        // do nothing if we can
        if (changeSet.StatusReason?.includes("didn't contain changes.")) {
            this.logger.log("no changes required!");
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

        if (allowUserInteraction == true) {
            // let allow = true;
            let userInteraction = new Interaction();
            let allow = await userInteraction.confirmChanges(changeSet);
            userInteraction.close();
            if (allow == false) {
                this.logger.log(
                    "Changes not accepted\nPlease make proper changes and accept to commit"
                );
                return;
            }
        }
        await this.executeChangeSet(changeSetName);
        this.stackExists = true;
        await this.syncRemoteState();


    }

    /**
     * Create a change set from the current localTemplate
     *
     * @param changeSetName .
     */
    private async createChangeSet(
        changeSetName: string
    ): Promise<AWS.CloudFormation.DescribeChangeSetOutput> {
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
            this.logger.debug(
                `(${event.ResourceType}) ${event.ResourceStatus} => ${event.ResourceStatusReason}`
            );

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
        this.logger.debug("Local:");
        this.logger.debug(JSON.stringify(this.localTemplate));

        this.logger.debug("Remote:");
        this.logger.debug(JSON.stringify(this.remoteTemplate));
    }
}
