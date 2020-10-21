import { Stack } from './stack';
import { Resource } from './resource';
import { iTag } from './tag';

/**
 * All properties that can be attached to an S3 bucket. 
 * We use the cdk bucket props class because it's just an interface.
 * We re-export this class so that users do not need to be aware that 
 * this is a CDK class
 */
import { BucketProps as CDKBucketProps } from '@aws-cdk/aws-s3';

interface NDSLBucketProps {
    tags?: iTag[];
};

type BucketProps = CDKBucketProps & NDSLBucketProps;

export { BucketProps };

/**
 * An S3 bucket resource. One of the most simple resources 
 * to allocate which is why it is used here.
 */
export class Bucket extends Resource {
    private props: BucketProps;

    private static DEFAULT_PROPS: BucketProps = {
        bucketName: "I_HAVE_NO_IDEA"
    };

    constructor(stack: Stack, id: string, props: BucketProps = {}) {
        super(stack, id);
        this.props = props;
    }

    /**
     * The commit method is used to modify (and possibly commit) the 
     * backing CF engine for this object.
     */
    async commit() {
        await super.commit();

        const updatedProps: {[id: string]: any} = {};
        const keys = Object.keys(this.props);
        keys.forEach((e) => {
            const newName = e.charAt(0).toUpperCase() + e.slice(1);
            updatedProps[newName] = (this.props as any)[e];
        });
        await this.stack.engine.addResource(this.id, {
            Type: "AWS::S3::Bucket",
            Properties: updatedProps,
        });

        // update the stack cloudformation with a definition for this bucket and update the stack in AWS
        await this.stack.engine.commit();

        console.log(`Bucket ${this.id} was commited!`);
    }
}