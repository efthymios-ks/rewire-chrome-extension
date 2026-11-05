import type { ILogger } from "./ILogger";

const LogPrefix = "[Rewire]";

export class ConsoleLogger implements ILogger {
    warn(message: string, context?: unknown): void {
        console.warn(`${LogPrefix} ${message}`, context ?? "");
    }

    error(message: string, context?: unknown): void {
        console.error(`${LogPrefix} ${message}`, context ?? "");
    }
}
