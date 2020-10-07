import { Stack, StackProps, Bucket } from '../src';
import { expect } from 'chai';

it('Handles vanilla CDK code', async () => {
    class MySimpleStack extends Stack {
        public storage: Bucket;
    
        constructor(name: string, props?: StackProps) {
            super(name, props);
    
            this.storage = new Bucket(this, "CloudFormationID_SimpleBucket", {
                bucketName: "PublicName"
            });

            console.log("Some custom logic!");
            console.log("Notice that logic was executed before stack was created... BAD!");
        }
    }
        
    // Create a new instance of this stack, this would likely be one stage. Lets pretend it's beta.
    const myStack = new MySimpleStack("StackCloudFormationID_MySimpleStack");

    // actually go create this thing (this part is not in the CDK and would need to be added to existing CDK scripts)
    await myStack.commit();
});

it('Handles non-vanilla CDK code', async () => {
    class MyComplexStack extends Stack {
        public storage?: Bucket;
    
        // Notice that creation logic moved to the setup method
        protected async setup(): Promise<void> {
            // Allocate bucket as before
            this.storage = new Bucket(this, "CloudFormationID_ComplexStack", {
                bucketName: "PublicName"
            });
    
            // Since we want to interact with this bucket immediately, we should commit it immediately
            await this.storage.commit();
    
            console.log("Some custom logic!");
            console.log("Notice that logic was executed after resources were created...GOOD!");
        }
    }
    
    const myStack = new MyComplexStack("StackCloudFormationID_MyComplexStack");

    // actually go create this thing. I don't care that the stack has a post 
    // constructor setup stage because commit takes care of that
    await myStack.commit();
});

it('Errors on out of order case', async () => {
    class MyStack extends Stack {
        public bucket1?: Bucket;
        public bucket2?: Bucket;
    
        protected async setup(): Promise<void> {
            this.bucket1 = new Bucket(this, "CloudFormationID1", {
                bucketName: "PublicName2"
            });

            this.bucket2 = new Bucket(this, "CloudFormationID2", {
                bucketName: "PublicName2"
            });
    
            // Commit bucket2 before bucket1 (scarry!)
            await this.bucket2.commit();
        }
    }
    
    const myStack = new MyStack("StackCloudFormationID_MyStack");

    await myStack.commit();
});

it.skip('Allows for interactive confirmation of each commit', async () => {

});

it.skip('Generates Cloud formation script as it commits', async () => {

});

it.skip('Generates diff between commits to understand required changes', async () => {

});

it.skip('Loads existing cloudformation to ensure old resources are not recreated', async () => {

});