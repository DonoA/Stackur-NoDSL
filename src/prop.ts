// WIP, trying to figure out how to easily compile the 
// CDK interfaces into CF objects
export abstract class Property<T> {
    abstract compile(): T;
}