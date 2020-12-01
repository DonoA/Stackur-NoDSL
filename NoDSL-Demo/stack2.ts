import { Stack, Bucket, awsAuthenticate, Task, Logger, LogLevel, BucketAccessControl } from "stackur-nodsl";
import fs from "fs";
import AWS from "aws-sdk";

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
            accessControl: BucketAccessControl.PUBLIC_READ
        });

        let S3Client = new AWS.S3();

        new Task(this, "Add index file", {
            task: async () => {
                const indexFile = fs.readFileSync('index.html', 'utf-8');
                await S3Client.putObject({
                    Bucket: this.storage?.arn as string,
                    Key: 'index.html',
                    Body: indexFile,
                    ContentType: 'text/html',
                    ACL: 'public-read',
                }).promise();
            },
        });

        new Task(this, "Show Site", {
            task: async () => {
                console.log(`Website: https://${this.storage?.arn}.s3.${this.region}.amazonaws.com/index.html`);
            },
        });
    }
}

(async () => {
    const appStack = new ApplicationStack("WebsiteStack", {
        logger: new Logger(LogLevel.Info),
    });
    
    await appStack.commit();
})();