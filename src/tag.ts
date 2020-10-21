import { Property } from "./prop";
// WIP, tags seem to be created and passed in to multiple 
// objects. More reasearch required
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