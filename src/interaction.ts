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
    private confirmed: boolean;

    constructor() {
        this.confirmed = false;
    }

    parseChangeSet(changeSet: object) {
        console.log("These are the changes you want to make:");
        console.log(changeSet);

        rl.question("Do you accept these changes? [y/n] ", (answer) => {
            switch (answer.toLowerCase()) {
                case "y":
                    console.log("Super!");
                    break;
                case "n":
                    console.log("Sorry! :(");
                    break;
                default:
                    console.log("Invalid answer!");
            }
            rl.close();
        });
    }

    // promptUser() {}
}
