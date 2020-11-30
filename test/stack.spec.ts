import { Stack, StackProps, Bucket } from "../src";
import * as TestUtils from "./test_utils";

TestUtils.setupAWS();

// const CLEANUP = false;
const CLEANUP = true;

describe("NoDSL Stack", function () {
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

    it.skip("Handles vanilla CDK code", async function () {
        class MySimpleStack extends Stack {
            public storage: Bucket;

            constructor(name: string, props?: StackProps) {
                super(name, props);

                this.storage = new Bucket(
                    this,
                    "CloudFormationIDSimpleBucket",
                    {
                        bucketName: `stackur-public-bucket-${testId}`,
                    }
                );

                console.log("Some custom logic!");
                console.log(
                    "Notice that logic was executed before stack was created... BAD!"
                );
            }
        }

        // Create a new instance of this stack, this would likely be one stage. Lets pretend it's beta.
        const myStack = new MySimpleStack(`MySimpleStack${testId}`);

        // actually go create this thing (this part is not in the CDK and would need to be added to existing CDK scripts)
        await myStack.commit();
    });

    it.skip("Allows for interactive confirmation of each commit", async () => {
        class MyComplexStack extends Stack {
            public storage?: Bucket;

            // Notice that creation logic moved to the setup method
            protected async setup(): Promise<void> {
                // Allocate bucket as before
                this.storage = new Bucket(this, "Bucket1", {
                    bucketName: `stackur-public-bucket-${testId}`,
                });
            }
        }

        // readline user input object

        const myStack = new MyComplexStack(`MyComplexStack${testId}`);

        // actually go create this thing. I don't care that the stack has a post
        // constructor setup stage because commit takes care of that
        await myStack.commit(true);
    });

    it.skip("Generates diff between commits to understand required changes", async () => {});
});
