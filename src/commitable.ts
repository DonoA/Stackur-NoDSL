export abstract class Commitable {
    public commited: boolean = false;

    abstract async commit(force?: boolean): Promise<void>;
}