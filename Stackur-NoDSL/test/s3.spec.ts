import { Stack, Bucket, Logger, LogLevel } from "../src";
import * as TestUtils from "./test_utils";

TestUtils.setupAWS();

// const CLEANUP = false;
const CLEANUP = true;

describe("NoDSL S3 Buckets", function () {
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


    it("Can be created", async () => {
        class MyComplexStack extends Stack {
            public storage?: Bucket;

            // Notice that creation logic moved to the setup method
            protected async setup(): Promise<void> {
                // Allocate bucket as before
                this.storage = new Bucket(this, "bucket", {
                    bucketName: `stackur-public-bucket-${testId}`,
                });
            }
        }

        const myStack = new MyComplexStack(`MyComplexStack${testId}`, {
            logger: new Logger(LogLevel.Debug)
        });
        TestUtils.trackStack(myStack);

        // actually go create this thing. I don't care that the stack has a post
        // constructor setup stage because commit takes care of that
        await myStack.commit();

        console.log(`Created bucket arn: ${myStack.storage?.arn}`);
    });

    it.skip("Can have CDK style tags", async () => {
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
            }
        }

        const myStack = new MyComplexStack(`MyComplexStack${testId}`);
        TestUtils.trackStack(myStack);

        // actually go create this thing. I don't care that the stack has a post
        // constructor setup stage because commit takes care of that
        await myStack.commit();
    });

    it.skip("Backfills values once created", async () => {
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
            }
        }

        const myStack = new MyComplexStack(`MyComplexStack${testId}`);
        TestUtils.trackStack(myStack);

        // actually go create this thing. I don't care that the stack has a post
        // constructor setup stage because commit takes care of that
        await myStack.commit();
    });
});