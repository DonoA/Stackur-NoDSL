import { Stack, Bucket, awsAuthenticate, Task } from "stackur-nodsl";
import fs from "fs";
import { S3 } from "aws-sdk";

const keys = JSON.parse(fs.readFileSync("./secrets.json", "utf-8"));
awsAuthenticate({
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey,
    region: "us-east-2",
});

class ApplicationStack extends Stack {
    protected storage?: Bucket;

    protected async setup(): Promise<void> {
        this.storage = new Bucket(this, "WebsiteBucket", {
            bucketName: `stackur-public-bucket`,
            publicReadAccess: true,
        });

        let S3Client = new S3();

        new Task(this, {
            task: async () => {
                await S3Client.putObject({
                    Bucket: this.storage?.arn as string,
                    Key: 'index.html',
                    Body: fs.readFileSync('index.html', 'utf-8')
                }).promise();
            },
        });
    }
}

(async () => {
    const appStack = new ApplicationStack("WebsiteStack");

    await appStack.commit();
})();