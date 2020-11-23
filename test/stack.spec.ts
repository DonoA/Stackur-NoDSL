import { Stack, StackProps, Bucket, Task } from '../src';
import { expect } from 'chai';
import AWS from 'aws-sdk';
import { CloudFormation } from 'aws-sdk';

import fs from 'fs';

const keys = JSON.parse(fs.readFileSync('./secrets.json', 'utf-8'));
AWS.config.update({
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey,
    region: 'us-east-2'
});

// const CLEANUP = false;
const CLEANUP = true;

describe('NoDSL', function() {
    let testId: string;
    
    // Before each test, generate a new testId. This is used to ensure values 
    // within the tests do not conflict (all stacks will be created at the same 
    // time and must have unique names)
    beforeEach(() => {
        testId = `${process.env.USER}${new Date().getTime()}`;
    })

    // Set test timeout to 10 min. Creating stacks is hard work!
    this.timeout(10 * 60 * 1000);

    // After all tests are run, delete all stacks that were created
    after(async function() {
        if(!CLEANUP) {
            return;
        }

        const cfClient = new CloudFormation();
        const stackRes = await cfClient.listStacks().promise();
        const stacks: CloudFormation.ListStacksOutput = stackRes.$response.data || {};
        for(const stack of stacks.StackSummaries || []) {
            if(stack.StackStatus === 'DELETE_COMPLETE') {
                continue;
            }
            console.log(stack.StackName);
            if(!stack.StackName.includes(process.env.USER as string)) {
                continue;
            }
            await cfClient.deleteStack({
                StackName: stack.StackName
            }).promise();
            await cfClient.waitFor('stackDeleteComplete', {
                StackName: stack.StackName
            });
            console.log(`Deleted ${stack.StackName}`);
        }
    });

    it.skip('Handles vanilla CDK code', async function() {
        class MySimpleStack extends Stack {
            public storage: Bucket;
        
            constructor(name: string, props?: StackProps) {
                super(name, props);
        
                this.storage = new Bucket(this, "CloudFormationIDSimpleBucket", {
                    bucketName: `stackur-public-bucket-${testId}`,
                    // tags: [{Key: 'SampleTag', Value: 'TagValue'}],
                });
    
                console.log("Some custom logic!");
                console.log("Notice that logic was executed before stack was created... BAD!");
            }
        }
            
        // Create a new instance of this stack, this would likely be one stage. Lets pretend it's beta.
        const myStack = new MySimpleStack(`MySimpleStack${testId}`);
    
        // actually go create this thing (this part is not in the CDK and would need to be added to existing CDK scripts)
        await myStack.commit();
    });
    
    it.skip('Handles non-vanilla CDK code', async () => {
        class MyComplexStack extends Stack {
            public storage?: Bucket;
        
            // Notice that creation logic moved to the setup method
            protected async setup(): Promise<void> {
                // Allocate bucket as before
                this.storage = new Bucket(this, "CloudFormationIDComplexStack", {
                    bucketName: `stackur-public-bucket-${testId}`
                });
        
                new Task(this, {
                    task: async () => {
                        console.log("Some custom logic!");
                    },
                    condition: async () => {
                        return true;
                    }
                });

                new Task(this, {
                    task: async () => {
                        console.log("Notice that logic was executed after resources were created...GOOD!");
                    }
                });
            }
        }
        
        const myStack = new MyComplexStack(`MyComplexStack${testId}`);
    
        // actually go create this thing. I don't care that the stack has a post 
        // constructor setup stage because commit takes care of that
        await myStack.commit();
    });

    it('Handles resource and task mixing', async () => {
        class MyComplexStack extends Stack {
            public storage?: Bucket;
            public storage2?: Bucket;
        
            // Notice that creation logic moved to the setup method
            protected async setup(): Promise<void> {
                // Allocate bucket as before
                this.storage = new Bucket(this, "Bucket1", {
                    bucketName: `stackur-public-bucket-${testId}`
                });
        
                new Task(this, {
                    task: async () => {
                        console.log("Some custom logic!");
                        console.log("Notice that logic was executed after resources were created...GOOD!");
                    }
                });

                this.storage2 = new Bucket(this, "Bucket2", {
                    bucketName: `stackur-public-bucket2-${testId}`
                });
            }
        }
        
        const myStack = new MyComplexStack(`MyComplexStack${testId}`);
    
        // actually go create this thing. I don't care that the stack has a post 
        // constructor setup stage because commit takes care of that
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
});
