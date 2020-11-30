import { Stack, StackProps, Bucket, Task } from "../src";
import * as TestUtils from "./test_utils";

TestUtils.setupAWS();

// const CLEANUP = false;
const CLEANUP = true;

describe("NoDSL Tasks", function () {
    let testId: string;

    // Before each test, generate a new testId. This is used to ensure values
    // within the tests do not conflict (all stacks will be created at the same
    // time and must have unique names)
    beforeEach(() => {
        testId = `${process.env.USER}${new Date().getTime()}`;
    });

    // Set test timeout to 10 min. Creating stacks is hard work!
    this.timeout(10 * 60 * 1000);

    // After all tests are run, delete all stacks that were created
    after(async function () {
        await TestUtils.cleanStacks(CLEANUP);
    });


    it.skip("Can be run inline with resources", async () => {
        class MyComplexStack extends Stack {
            public storage?: Bucket;

            // Notice that creation logic moved to the setup method
            protected async setup(): Promise<void> {
                // Allocate bucket as before
                this.storage = new Bucket(
                    this,
                    "CloudFormationIDComplexStack",
                    {
                        bucketName: `stackur-public-bucket-${testId}`,
                    }
                );

                new Task(this, {
                    task: async () => {
                        console.log("Some custom logic!");
                    },
                    condition: async () => {
                        return true;
                    },
                });

                new Task(this, {
                    task: async () => {
                        console.log(
                            "Notice that logic was executed after resources were created...GOOD!"
                        );
                    },
                });
            }
        }

        const myStack = new MyComplexStack(`MyComplexStack${testId}`);

        // actually go create this thing. I don't care that the stack has a post
        // constructor setup stage because commit takes care of that
        await myStack.commit();
    });

    it.skip("Can be run intermixed with resources", async () => {
        class MyComplexStack extends Stack {
            public storage?: Bucket;
            public storage2?: Bucket;

            // Notice that creation logic moved to the setup method
            protected async setup(): Promise<void> {
                // Allocate bucket as before
                this.storage = new Bucket(this, "Bucket1", {
                    bucketName: `stackur-public-bucket-${testId}`,
                });

                new Task(this, {
                    task: async () => {
                        console.log("Some custom logic!");
                        console.log(
                            "Notice that logic was executed after resources were created...GOOD!"
                        );
                    },
                });

                this.storage2 = new Bucket(this, "Bucket2", {
                    bucketName: `stackur-public-bucket2-${testId}`,
                });
            }
        }

        const myStack = new MyComplexStack(`MyComplexStack${testId}`);

        // actually go create this thing. I don't care that the stack has a post
        // constructor setup stage because commit takes care of that
        await myStack.commit();
    });
});