import { Committable } from "./commitable";
import { Stack } from "./stack";

/**
 * A super class for all resources that can be placed within a stack.
 *
 * An individual resource can be commited on it's own or in a stack.
 */
export abstract class Resource extends Committable {
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
     * The commit method is used to modify the
     * backing CF engine for this object.
     *
     * This is also where the easy to use interfaces should be
     * translated into cloudformation.
     *
     * This method is essentially a compile method.
     */
    async commit() {
        this.commited = true;
    }

    /**
     * Run to delete this resource. Often this method is never called
     * as the backing CF engine is simply called to destroy the
     * whole stack.
     */
    async uncommit() { }
}
