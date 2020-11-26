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

import Table from "cli-table";
import * as readline from "readline";

// let rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
// });

export class Interaction {
    private rl: readline.Interface;

    // readlie
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }

    close() {
        this.rl.close();
    }

    // pass in readline
    async confirmChanges(changeSet: any): Promise<boolean> {
        const table = new Table({
            head: ["Type", "Action", "Logistical Resource Id", "Resource Type"],
            colWidths: [10, 20, 30, 30],
        });

        console.log("These are the changes you want to make:");
        console.log(changeSet);
        console.log("ChangeSet Name: ", changeSet.ChangeSetName);
        console.log("Stack Name: ", changeSet.StackName);
        console.log("Changes: ");
        let rows: any = [];
        changeSet.Changes?.forEach((change: any) => {
            let temp = [];
            temp.push(change.Type);
            temp.push(change.ResourceChange.Action);
            temp.push(change.ResourceChange.LogicalResourceId);
            temp.push(change.ResourceChange.ResourceType);
            table.push(temp);
        });

        // console.log(rows);
        console.log(table.toString());
        while (true) {
            let answer: string = await new Promise((res, rej) =>
                this.rl.question("Do you accept these changes? [y/n] ", res)
            ); // this.props.questions,?
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
        }
    }
}
