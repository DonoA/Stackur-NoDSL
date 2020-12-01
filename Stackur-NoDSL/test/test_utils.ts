import { CloudFormation } from "aws-sdk";
import { awsAuthenticate, Stack } from "../src";

import fs from "fs";

let configured = false;

export function setupAWS() {
    if (configured) {
        return;
    }
    configured = true;

    const keys = JSON.parse(fs.readFileSync("./secrets.json", "utf-8"));
    awsAuthenticate({
        accessKeyId: keys.accessKeyId,
        secretAccessKey: keys.secretAccessKey,
        region: "us-east-2",
    });
}

let stacks: Stack[] = []

export async function cleanStacks(CLEANUP: boolean) {
    if (!CLEANUP) {
        return;
    }

    for(const stack of stacks) {
        await stack.uncommit();
        console.log(`Deleted ${stack.getName()}`);
    }

    stacks = [];
}

export function trackStack(stack: Stack) {
    stacks.push(stack);
}


