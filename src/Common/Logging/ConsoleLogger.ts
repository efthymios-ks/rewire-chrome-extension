import type { Logger } from './Logger';

const LOG_PREFIX = '[Rewire]';

export class ConsoleLogger implements Logger {
    warn(message: string, context?: unknown): void {
        console.warn(`${LOG_PREFIX} ${message}`, context ?? '');
    }

    error(message: string, context?: unknown): void {
        console.error(`${LOG_PREFIX} ${message}`, context ?? '');
    }
}
