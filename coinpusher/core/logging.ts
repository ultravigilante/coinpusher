import { rootDirectory } from "./root"
import { relative } from "path"
import env from "../env"

type LogLevel = "debug" | "info" | "warn" | "error"

export class Logger {
    private name : string
    private minPriority : number

    constructor(params : {
        path : string
    }) {
        this.name = relative(rootDirectory, params.path)
        this.minPriority = this.getPriority(env.core.logLevel)
    }

    private getPriority(level : LogLevel) : number {
        return {
            "debug": 0,
            "info": 1,
            "warn": 2,
            "error": 3
        }[level]
    }

    private log(level : LogLevel, message : string) {
        if(this.getPriority(level) >= this.minPriority) {
            console.log(`[${level} - ${this.name} - ${new Date().toISOString()}] - ${message}`)
        }
    }

    debug(message : string) {
        this.log("debug", message)
    }

    info(message : string) {
        this.log("info", message)
    }

    warn(message : string) {
        this.log("warn", message)
    }

    error(message : string) {
        this.log("error", message)
    }
}
