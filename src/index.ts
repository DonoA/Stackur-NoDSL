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

    protected async setup(): Promise<void> { };

    async destroy(): Promise<void> { };

    // TODO: Go create this stack. Add any items that are not already commited.
    // This will create the stack in Cloudformation if it does not already exist.
    async commit(): Promise<void> {
        await this.setup()
        
        // ....
    }
    
    addResource(resource: Resource) {
        this.resoruces.push(resource);
    }
}

/**
 * A super class for all resources that can be placed within a stack.
 * 
 * An individual resource can be commited on it's own or in a stack.
 */
export abstract class Resource {
    protected stack: Stack;

    public commited: boolean = false;

    constructor(stack: Stack) {
        this.stack = stack;
        stack.addResource(this);
    }

    async commit(): Promise<boolean> {
        if(this.commited) {
            return true;
        }
        this.commited = true;

        // TODO: if the stack this bucket is a part of doesn't exist, create the stack

        return false;
    };

    abstract generateCf(): string;
}

/**
 * All properties that can be attached to an S3 bucket. 
 * This is a copy of BucketProps in the base CDK package. (Maybe we should just import it)
 */
export interface BucketProps {
    bucketName?: string
}

/**
 * An S3 bucket resource. One of the most simple resources 
 * to allocate which is why it is used here.
 */
export class Bucket extends Resource {
    
    private name: string;
    private props?: BucketProps;

    private static DEFAULT_PROPS: BucketProps = {
        bucketName: "I_HAVE_NO_IDEA"
    };

    constructor(stack: Stack, id: string, props?: BucketProps) {
        super(stack);
        this.name = name;
        this.props = props;
    }

    async commit(): Promise<boolean> {
        // if this item was already commited, no need to do it again. 
        // This will need to be in all commit implementations
        if(await super.commit()) {
            return true;
        }

        // update the stack cloudformation with a definition for this bucket and update the stack in AWS

        return false;
    }

    generateCf(): string {
        return "THIS IS A BUCKET";
    }
}