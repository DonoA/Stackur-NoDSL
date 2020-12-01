import { Stack } from "./stack";
import { Resource } from "./resource";

import * as lambda from '@aws-cdk/aws-lambda';
import { cdkPropTranslate } from './cdk_prop_translate';

/**
 * All properties that can be attached to an S3 bucket.
 * We use the cdk bucket props class because it's just an interface.
 * We re-export this class so that users do not need to be aware that
 * this is a CDK class
 */
import { FunctionProps as CDKProps } from "@aws-cdk/aws-lambda";

interface NDSLProps { }

type FunctionProps = CDKProps & NDSLProps;

export { FunctionProps };

/**
 * An S3 bucket resource. One of the most simple resources
 * to allocate which is why it is used here.
 */
export class Function extends Resource {
    private props: FunctionProps;

    constructor(stack: Stack, id: string, props: FunctionProps) {
        super(stack, id);
        this.props = props;
    }

    async commit() {
        await super.commit();

        const templates = cdkPropTranslate((stack) => {
            new lambda.Function(stack, this.id, this.props);
        });

        const template = templates[0];

        // Do additional translation
        
        await this.stack.engine.addResource(this.id, template);

        // update the stack cloudformation with a definition for this bucket and update the stack in AWS
        await this.stack.engine.commit();
    }
}
