/**
 * Committable represents a class that can be committed.
 * 
 * This is generally a resource or task. Anything that extends 
 * this class can be inserted into a stack and called along 
 * with normal resources and tasks.
 */
export abstract class Committable {
    public commited: boolean = false;

    abstract async commit(force?: boolean): Promise<void>;
}