import type { ILogger } from "../Logging/ILogger";

export const BackgroundTask = {
    run(
        logger: ILogger,
        description: string,
        task: () => Promise<unknown>
    ): void {
        task().catch(error => logger.error(`${description} failed.`, error));
    },
};
