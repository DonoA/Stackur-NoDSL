import { Stack } from "./stack";

export interface CommandLineArgProps {
    commit: () => Promise<void>;
    uncommit: () => Promise<void>;
}

export class CommandLineExecutor {
    private props: CommandLineArgProps;

    private commit: () => Promise<void>;
    private uncommit: () => Promise<void>;
    
    static for(stack: Stack) {
        return new CommandLineExecutor({
            commit: async () => await stack.commit(),
            uncommit: async () => await stack.uncommit(),
        });
    }

    constructor(props: CommandLineArgProps) {
        this.props = props;
        this.commit = props.commit
        this.uncommit = props.uncommit
    }

    async execute(args: string[]) {
        if(args.length === 0 || args[0] === "commit") {
            await this.commit();
            return;
        }

        if(args[0] === "uncommit") {
            await this.uncommit();
            return;
        }
    }
}