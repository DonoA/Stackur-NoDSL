import { Property } from "./prop";

export interface iTag {
    Key: string,
    Value: string,
};

export class Tag implements iTag{
    readonly Key: string;
    readonly Value: string;
    
    constructor(key: string, value: string) {
        this.Key = key;
        this.Value = value;
    }
}