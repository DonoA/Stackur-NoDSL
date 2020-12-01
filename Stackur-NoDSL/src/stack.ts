import { CFEngine } from "./cf_engine";
import { Committable } from "./commitable";
import { Logger, LogLevel } from "./logger";
import AWS from "aws-sdk";

/**
 * Interface that defines the configuration that can be applied to any stack
 */
export interface StackProps {
    workingDir?: string;
    logger?: Logger;
    region?: string;
    interactive?: boolean;
}

/**
 * A stack. The most basic building block of a NoDSL application.
 * A stack defines a collection of other resources. The resources in
 * a stack can be allocated all at once or in stages.
 *
 * A default stack does nothing and cannot be created. The stack should be
 * extended to define functionality.
 *
 * The setup method is used for allocating resources.
 *
 * The destroy method is used to delete any resources not captured by the
 * cloudformation script.
 */
export abstract class Stack {
    private name: string;
    private props?: StackProps;
    readonly engine: CFEngine;
    readonly logger: Logger;
    readonly region?: string;

    private isSetup: boolean = false;

    private stages: Committable[] = [];

    constructor(name: string, props?: StackProps) {
        this.name = name;
        this.props = props;
        this.region = props?.region || AWS.config.region;
        this.logger = this.props?.logger || new Logger(LogLevel.Log);
        this.engine = new CFEngine(name, {
            logger: this.logger,
            interactive: props?.interactive,
        });
    }

    /**
     * Designed to be overridden by sub-classes. Essentially an async constructor for
     * setting up resources that may require async operations to be performed. Should
     * be used over constructor resource definitions whenever possible.
     */
    protected async setup() {}

    /**
     * Designed to be overridden by sub-classes. Some resources may require special
     * destruction steps. That extra logic goes here.
     *
     * This method must run deleteAllResources, some logic should be added to ensure
     * that happens
     */
    protected async destroy() {}

    protected async deleteAllResources() {}

    /**
     * Commits all uncommited resources within the stack. Essentially creates the stack in AWS.
     */
    async commit(): Promise<void> {
        this.logger.log(`Committing ${this.name}`);

        if(!this.isSetup) {
            await this.engine.setup();
            await this.setup();
            this.isSetup = true;
        }


        for (const resource of this.stages) {
            // Stages get compiled together and submitted as a change set
            // calculated what changes will be made
            await resource.commit(true);
        }

        // just to clean up anything that didn't get commited for some reason
        // await this.engine.commit(false);
    }

    async uncommit(): Promise<void> {
        this.logger.log(`Uncommitting ${this.name}`);
    
        if(!this.isSetup) {
            await this.engine.setup();
            await this.setup();
            this.isSetup = true;
        }

        for (const resource of this.stages) {
            // Stages get compiled together and submitted as a change set
            // calculated what changes will be made
            await resource.uncommit();
        }

        await this.engine.uncommit();
    }

    addStage(resource: Committable) {
        this.stages.push(resource);
    }

    getName(): string {
        return this.name;
    }
}
