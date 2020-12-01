import * as cdk from '@aws-cdk/core';

class BackingStack extends cdk.Stack {
    constructor(app: cdk.App) {
        super(app, 'BackingStack', {});
    }
}

export function cdkPropTranslate(resourceConstructor: (stack: cdk.Stack) => void): any[] {
    const backingApp = new cdk.App();
    const backingStack = new BackingStack(backingApp);

    const resource = resourceConstructor(backingStack);

    const cf = (backingStack as any)._toCloudFormation();
    const resources = cf.Resources;
    const props = Object.getOwnPropertyNames(resources);
    return props.map(prop => resources[prop]);
}