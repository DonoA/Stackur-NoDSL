import { Stack } from "./stack";
import { Resource } from "./resource";

import * as s3 from '@aws-cdk/aws-s3';
import { cdkPropTranslate } from './cdk_prop_translate';

/**
 * All properties that can be attached to an S3 bucket.
 * We use the cdk bucket props class because it's just an interface.
 * We re-export this class so that users do not need to be aware that
 * this is a CDK class
 */
import { BucketProps as CDKBucketProps } from "@aws-cdk/aws-s3";
import AWS from "aws-sdk";

export { BucketAccessControl } from "@aws-cdk/aws-s3";

interface NDSLBucketProps { }

type BucketProps = CDKBucketProps & NDSLBucketProps;

export { BucketProps };

/**
 * An S3 bucket resource. One of the most simple resources
 * to allocate which is why it is used here.
 */
export class Bucket extends Resource {
    private props: BucketProps;
    private cdkBucket?: s3.Bucket;

    constructor(stack: Stack, id: string, props: BucketProps = {}) {
        super(stack, id);
        this.props = props;

        this.arn = this.stack.engine.getArnFor(this.id);
    }

    async commit() {
        this.stack.logger.info(`Creating Bucket ${this.id}`);

        await super.commit();

        const templates = cdkPropTranslate((stack) => {
            this.cdkBucket = new s3.Bucket(stack, this.id, this.props);
        });

        const bucketTemplate = templates[0];
        this.stack.logger.debug(bucketTemplate);

        // Do additional translation
        
        await this.stack.engine.addResource(this.id, bucketTemplate);

        // update the stack cloudformation with a definition for this bucket and update the stack in AWS
        await this.stack.engine.commit();

        this.arn = this.stack.engine.getArnFor(this.id);

        this.stack.logger.info(`Created Bucket ${this.id}`);
    }

    async uncommit() {
        if(!this.arn) {
            return;
        }

        this.stack.logger.info(`Destroying Bucket ${this.id}`);

        const client = new AWS.S3();
        const objects = await client.listObjectsV2({
            Bucket: this.arn as string,
        }).promise();

        this.stack.logger.debug(`Removing ${objects.Contents?.length} objects`);

        for(const object of objects.Contents || []) {
            await client.deleteObject({
                Bucket: this.arn as string,
                Key: object.Key as string
            }).promise();
        }

        // Unclear if versions need removal, right now it seems they don't
        // const versions = await client.listObjectVersions({
        //     Bucket: this.arn as string,
        // }).promise();

        // this.stack.logger.info(`Removing ${versions.Versions?.length} versions`);

        // for(const version of versions.Versions || []) {
        //     await client.deleteObject({
        //         Bucket: this.arn as string,
        //         Key: version.Key as string
        //     }).promise();
        // }

        const res = await client.deleteBucket({
            Bucket: this.arn as string,
        }).promise();
    }
}
