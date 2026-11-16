export interface Logger {
    warn(message: string, context?: unknown): void;
    error(message: string, context?: unknown): void;
}
