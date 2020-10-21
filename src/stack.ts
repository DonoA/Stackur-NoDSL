import { CFEngine } from './cf_engine';
import { Resource } from './resource';

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
    readonly engine: CFEngine;

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
        this.engine = new CFEngine(name);
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
        await this.engine.setup();

        let prevCommited = this.resoruces[0].commited;
        for(const resource of this.resoruces) {
            if(!prevCommited && resource.commited) {
                throw new Error(`Out of order initialization of ${resource.id}`);
            }

            prevCommited = resource.commited;
            await resource.commit(true);
        }

        this.engine.dumpCF();
        await this.engine.commit();
        this.engine.dumpCF();
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

}