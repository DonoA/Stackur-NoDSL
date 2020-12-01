import { Stack, Bucket, awsAuthenticate } from "stackur-nodsl";
import fs from "fs";

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
        });
    }
}

(async () => {
    const appStack = new ApplicationStack("WebsiteStack");

    await appStack.commit();
})();