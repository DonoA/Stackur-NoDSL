/**
 * Interface that defines the configuration that can be applied to any stack
 */
export interface StackProps {
    workingDir: string;
}

/**
 * A stack. The most basic building block of a NoDSL application. 
 * A stack defines a collection of other resources. The resources in 
 * a stack can be allocated all at once or in stages.
 * 
 * A default stack does nothing and cannot be created. The stack should be 
 * extended to define functionality.
 * 
 * The setup method is used for allocating resources.
 * 
 * The destroy method is used to delete any resources not captured by the 
 * cloudformation script.
 */
export abstract class Stack {
    
    private name: string;
    private props?: StackProps;

    private exists: boolean = false;
    private commited: boolean = false;

    // This is where the defaults will go. The pattern of optional props followed by 
    // constant defaults should used in all other resource classes as well (such as Bucket)
    private static DEFAULT_PROPS: StackProps = {
        workingDir: "./output"
    };

    private resoruces: Resource[] = [];

    constructor(name: string, props?: StackProps) {
        this.name = name;
        this.props = props;
    }

    /**
     * Designed to be overridden by sub-classes. Essentially an async constructor for 
     * setting up resources that may require async operations to be performed. Should 
     * be used over constructor resource definitions whenever possible.
     */
    protected async setup(): Promise<void> { };

    /**
     * Designed to be overridden by sub-classes. Some resources may require special 
     * destruction steps. That extra logic goes here.
     * 
     * This method might run before or after the AWS stack is deleted. (After is probably the best)
     */
    protected async destroy(): Promise<void> { };

    /**
     * Commits all uncommited resources within the stack. Essentially creates the stack in AWS.
     * 
     * TODO: Go create this stack. Add any items that are not already commited.
     * This will create the stack in Cloudformation if it does not already exist.
     */
    async commit(): Promise<void> {
        await this.setup();

        let prevCommited = this.resoruces[0].commited;
        for(const resource of this.resoruces) {
            if(!prevCommited && resource.commited) {
                throw new Error(`Out of order initialization of ${resource.id}`);
            }

            prevCommited = resource.commited;
            await resource.commit();
        }
    }

    addResource(resource: Resource) {
        this.resoruces.push(resource);
    }

    isCommited(): boolean {
        return this.commited;
    }

    getName(): string {
        return this.name;
    }

    getExists(): boolean {
        return this.exists;
    }

    setExists(v: boolean) {
        this.exists = v;
    }
}

/**
 * A super class for all resources that can be placed within a stack.
 * 
 * An individual resource can be commited on it's own or in a stack.
 */
export abstract class Resource {
    protected stack: Stack;
    readonly id: string;

    public commited: boolean = false;

    constructor(stack: Stack, id: string) {
        this.stack = stack;
        this.id = id;
        stack.addResource(this);
    }

    /**
     * Modifies the parent stack to create this resource. 
     * This function should only be called once per resource.
     * 
     * Maybe this function should also run all post setup steps so that they are 
     * also only executed once... maybe not. One major concern with adding any old 
     * logic to resource creation is that it might not need to be executed on every 
     * deploy. There should be a way of asserting that configuration (like adding a 
     * default file to an S3 bucket) is only run on resource creation.
     * 
     * Custom resource confiurations are not discrete so they cannot be reversed quite 
     * like stack resources. Many CDK resources already solve this problem through 
     * lambda use. We should examine those implementations to understand how we can 
     * apply similar functionality here.
     * 
     * @returns A boolean representing if the object has already 
     *          been committed.
     */
    async commit(): Promise<boolean> {
        if(this.commited) {
            return true;
        }
        this.commited = true;

        // exit if the stack for this resource already exists
        if(this.stack.getExists()) {
            return false;
        }

        // TODO: if the stack this resource is a part of doesn't exist, create the stack
        console.log(`Create stack ${this.stack.getName()}`);
        this.stack.setExists(true);

        return false;
    };

    /**
     * This should generate the needed cloud formation code to insert into the YAML file.
     * This might be helpful or it might not. Unclear.
     * 
     * @returns The YAML code
     */
    abstract generateCf(): string;
}

/**
 * All properties that can be attached to an S3 bucket. 
 * We use the cdk bucket props class because it's just an interface
 */
import { BucketProps } from '@aws-cdk/aws-s3';

import { CloudFormation } from 'aws-sdk';

/**
 * An S3 bucket resource. One of the most simple resources 
 * to allocate which is why it is used here.
 */
export class Bucket extends Resource {
    
    private props: BucketProps;

    private static DEFAULT_PROPS: BucketProps = {
        bucketName: "I_HAVE_NO_IDEA"
    };

    constructor(stack: Stack, id: string, props: BucketProps = {}) {
        super(stack, id);
        this.props = props;
    }

    /**
     * For example, the commit method of the bucket class should add some YAML
     * code to the parent stack that defines a bucket. If a definition for this
     * bucket already exists, we should simply update that bucket with new
     * configuration.
     */
    async commit(): Promise<boolean> {
        // if this item was already commited, no need to do it again.
        // This will need to be in all commit implementations
        if(await super.commit()) {
            return true;
        }

        const cf = this.generateCf();
        console.log(cf);
        const cfClient = new CloudFormation();
        const createRes = await cfClient.createStack({
            StackName: this.stack.getName(),
            TemplateBody: cf,
        }).promise();

        await new Promise((res, rej) => {
            const itervalId = setInterval(() => {
                cfClient.describeStackEvents({
                    StackName: this.stack.getName()
                }).promise().then((eventRes) => {
                    const events = (eventRes.$response.data || {}).StackEvents;
                    events?.forEach((event) => {
                        console.log(`${event.ResourceStatus} => ${event.ResourceStatusReason}`);
                        console.log(event.ResourceType);
                        console.log(event.ResourceProperties);
                    });
                    console.log('=============');
                    const latest = events?.[0];
                    if(latest?.ResourceStatus === 'ROLLBACK_COMPLETE') {
                        clearInterval(itervalId);
                        res();
                    }
                    if(latest?.ResourceStatus === 'CREATE_COMPLETE' && latest?.ResourceType === 'AWS::CloudFormation::Stack') {
                        clearInterval(itervalId);
                        res();
                    }
                });
            }, 5 * 1000);
        });

        // update the stack cloudformation with a definition for this bucket and update the stack in AWS
        console.log(`Bucket ${this.id} was commited!`);

        return false;
    }

    generateCf(): string {
        const updatedProps: any = {};
        const keys = Object.keys(this.props);
        keys.forEach((e) => {
            const newName = e.charAt(0).toUpperCase() + e.slice(1);
            updatedProps[newName] = (this.props as any)[e];
        });

        return JSON.stringify({
            AWSTemplateFormatVersion: "2010-09-09",
            Resources: {
                [this.id]: {
                    "Type": "AWS::S3::Bucket",
                    "Properties": updatedProps
                }
            }
        });
    }
}