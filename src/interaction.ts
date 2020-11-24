// "Type": "Resource",
//   "ResourceChange": {
//     "Action": "Add",
//     "LogicalResourceId": "Bucket1",
//     "ResourceType": "AWS::S3::Bucket",
//     "Scope": [],
//     "Details": []
//   }

import * as readline from "readline";

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

export class Interaction {
    constructor() {}

    confirmChanges(changeSet: object): boolean {
        console.log("These are the changes you want to make:");
        console.log(changeSet);

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
