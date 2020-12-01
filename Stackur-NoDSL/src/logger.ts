export enum LogLevel {
    None = 0, 
    Log,
    Info, 
    Debug
}

export class Logger {
    public logLevel: LogLevel;

    constructor(logLevel: LogLevel) {
        this.logLevel = logLevel;
    }

    log(...data: any) {
        if(this.logLevel < LogLevel.Log) {
            return;
        }

        console.log(...data);
    }

    info(...data: any) {
        if(this.logLevel < LogLevel.Info) {
            return;
        }

        console.log(...data);
    }

    debug(...data: any) {
        if(this.logLevel < LogLevel.Debug) {
            return;
        }

        console.log(...data);
    }
}