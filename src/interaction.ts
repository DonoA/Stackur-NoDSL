// export interface changeSet {
//     ResponseMetadata: DescribeChangeSetOutput;
//     ChangeSetName: string;
//     ChangeSetId: string;
//     StackId: string;
//     StackName: string;
//     Parameters: [];
//     CreationTime: Date;
//     ExecutionStatus: string;
//     Status: string;
//     NotificationARNs: [];
//     RollbackConfiguration: {};
//     Capabilities: [];
//     Tags: [];
//     Changes: [];
//     StatusReason?: any;
//     // DescribeChangeSetOutput: any;
// }

import * as readline from "readline";

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

export class Interaction {
    constructor() {}

    confirmChanges(changeSet: any): boolean {
        console.log("These are the changes you want to make:");
        console.log(changeSet);
        console.log("ChangeSet Name: ", changeSet.ChangeSetName);
        console.log("Stack Name: ", changeSet.StackName);
        console.log("Changes: ");
        changeSet.Changes?.forEach((change: any) => {
            console.log(JSON.stringify(change, undefined, 2));
        });
        rl.question("Do you accept these changes? [y/n] ", (answer) => {
            switch (answer.toLowerCase()) {
                case "y":
                    console.log("Changes Accepted");
                    return true;
                case "n":
                    console.log("Changed Denied");
                    return false;
                default:
                    console.log("Invalid character, please use y or n");
            }
            rl.close();
        });
        return false;
    }
}
