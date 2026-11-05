export interface ILogger {
    warn(message: string, context?: unknown): void;
    error(message: string, context?: unknown): void;
}
