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
    }

    async commit(allowUserInteraction: boolean) {
        this.stack.logger.info(`Creating Bucket ${this.id}`);

        await super.commit(allowUserInteraction);

        const templates = cdkPropTranslate((stack) => {
            this.cdkBucket = new s3.Bucket(stack, this.id, this.props);
        });

        this.stack.logger.debug(this.cdkBucket);

        const bucketTemplate = templates[0];
        this.stack.logger.debug(bucketTemplate);

        // Do additional translation
        
        await this.stack.engine.addResource(this.id, bucketTemplate);

        // update the stack cloudformation with a definition for this bucket and update the stack in AWS
        await this.stack.engine.commit(allowUserInteraction);

        this.arn = this.stack.engine.getArnFor(this.id);

        this.stack.logger.info(`Created Bucket ${this.id}`);
    }
}
