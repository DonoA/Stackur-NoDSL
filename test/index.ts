import { Stack, StackProps, Bucket } from '../src';
import { S3 } from 'aws-sdk';

// Example 1, a simple stack. This code is exactly the same as CDK code.
class MySimpleStack extends Stack {
    public storage: Bucket;

    constructor(name: string, props?: StackProps) {
        super(name, props);

        this.storage = new Bucket(this, "CloudFormationID", {
            bucketName: "PublicName"
        });
    }
}

(async () => {
    // Create a new instance of this stack, this would likely be one stage. Lets pretend it's beta.
    const myStack = new MySimpleStack("StackCloudFormationID_semiHumanReadable");

    // actually go create this thing (this part is not in the CDK and would need to be added to existing CDK scripts)
    await myStack.commit();
})();




// Example 2, a complex stack that leverages the value of NoDSL
const s3 = new S3({apiVersion: '2006-03-01'});

class MyComplexStack extends Stack {
    public storage?: Bucket;

    // Notice that creation logic moved to the setup method
    protected async setup(): Promise<void> {
        // Allocate bucket as before
        this.storage = new Bucket(this, "CloudFormationID", {
            bucketName: "PublicName"
        });

        // Since we want to interact with this bucket immediately, we should commit it immediately
        await this.storage.commit();

        // Add some default data
        await s3.putObject({
            Body: "Sample Data That I Would Like In My S3 Bucket Any Time It Is Created!", 
            Bucket: "PublicName", 
            Key: "init.txt"
        });
    }
}

(async () => {
    const myStack = new MyComplexStack("StackCloudFormationID_semiHumanReadable");

    // actually go create this thing. I don't care that the stack has a post 
    // constructor setup stage because commit takes care of that
    await myStack.commit();
})();