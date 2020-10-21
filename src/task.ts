import { Commitable } from './commitable';
import { Stack } from './stack';

type TaskCallback = () => Promise<void> | void;
type TaskCondition = () => Promise<boolean> | boolean;

interface TaskProps {
    task: TaskCallback;
    condition?: TaskCondition;
}

export class Task extends Commitable {
    private stack: Stack;
    private task: TaskCallback;
    private condition?: TaskCondition;
    
    constructor(stack: Stack, props: TaskProps) {
        super();
        this.stack = stack;
        this.task = props.task;
        this.condition = props.condition;

        this.stack.addStage(this);
    }

    async commit(force: boolean = false) {
        let condResult = this.condition?.();
        if(condResult instanceof Promise) {
            condResult = await condResult;
        }

        if(!condResult && !force) {
            return;
        }

        const taskResult = this.task();
        if(taskResult instanceof Promise) {
            await taskResult;
        }
    }
}