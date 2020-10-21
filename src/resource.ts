import { Commitable } from './commitable';
import { Stack } from './stack';

/**
 * A super class for all resources that can be placed within a stack.
 * 
 * An individual resource can be commited on it's own or in a stack.
 */
export abstract class Resource extends Commitable {
    protected stack: Stack;
    readonly id: string;
    public arn?: string;

    constructor(stack: Stack, id: string) {
        super();
        this.stack = stack;
        this.id = id;
        stack.addStage(this);
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
     */
    async commit() {
        this.commited = true;
    }
}
