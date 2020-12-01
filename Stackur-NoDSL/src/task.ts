import { Committable } from './commitable';
import { Stack } from './stack';

type TaskCallback = () => Promise<void> | void;
type TaskCondition = () => Promise<boolean> | boolean;

interface TaskProps {
    task: TaskCallback;
    condition?: TaskCondition;
}

/**
 * Defines a task to be executed while setting up resources.
 * Tasks are conditional logic that will be executed in order 
 * they are defined like resources.
 */
export class Task extends Committable {
    private stack: Stack;
    private name: string;
    private task: TaskCallback;
    private condition?: TaskCondition;
    
    constructor(stack: Stack, name: string, props: TaskProps) {
        super();
        this.stack = stack;
        this.name = name;
        this.task = props.task;
        this.condition = props.condition;

        this.stack.addStage(this);
    }

    /**
     * Execute the task. The task will only be run if the condition passes 
     * or force = true.
     * 
     * @param force Force the task to execute regardless of condition
     */
    async commit(force: boolean = false) {
        this.stack.logger.info(`Running Task ${this.name}`);

        let condResult = this.condition?.();
        if(condResult instanceof Promise) {
            condResult = await condResult;
        }

        if(this.condition !== undefined && !condResult && !force) {
            return;
        }

        const taskResult = this.task();
        if(taskResult instanceof Promise) {
            await taskResult;
        }
    }
}