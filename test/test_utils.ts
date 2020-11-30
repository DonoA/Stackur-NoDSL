import AWS from "aws-sdk";
import { CloudFormation } from "aws-sdk";

import fs from "fs";

let configured = false;

export function setupAWS() {
    if (configured) {
        return;
    }
    configured = true;

    const keys = JSON.parse(fs.readFileSync("./secrets.json", "utf-8"));
    AWS.config.update({
        accessKeyId: keys.accessKeyId,
        secretAccessKey: keys.secretAccessKey,
        region: "us-east-2",
    });
}

export async function cleanStacks(CLEANUP: boolean) {
    if (!CLEANUP) {
        return;
    }

    const cfClient = new CloudFormation();
    const stackRes = await cfClient.listStacks().promise();
    const stacks: CloudFormation.ListStacksOutput =
        stackRes.$response.data || {};
    for (const stack of stacks.StackSummaries || []) {
        if (stack.StackStatus === "DELETE_COMPLETE") {
            continue;
        }
        console.log(stack.StackName);
        if (!stack.StackName.includes(process.env.USER as string)) {
            continue;
        }
        await cfClient
            .deleteStack({
                StackName: stack.StackName,
            })
            .promise();
        await cfClient.waitFor("stackDeleteComplete", {
            StackName: stack.StackName,
        });
        console.log(`Deleted ${stack.StackName}`);
    }
}


