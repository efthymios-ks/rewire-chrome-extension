import type { Logger } from '../Logging/Logger';

interface LogFailureAsyncOptions {
    logger: Logger;
    description: string;
    pending: Promise<unknown>;
}

async function logFailureAsync({ logger, description, pending }: LogFailureAsyncOptions): Promise<void> {
    try {
        await pending;
    } catch (error) {
        logger.error(`${description} failed.`, error);
    }
}

export interface RunOptions {
    logger: Logger;
    description: string;
    task: () => Promise<unknown>;
}

export const BackgroundTask = {
    run({ logger, description, task }: RunOptions): void {
        void logFailureAsync({
            logger,
            description,
            pending: task(),
        });
    },
};
