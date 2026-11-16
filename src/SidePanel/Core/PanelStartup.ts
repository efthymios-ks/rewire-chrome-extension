import { ErrorText } from '../../Common/Errors/ErrorText';
import type { Logger } from '../../Common/Logging/Logger';
import { buildElement } from './Dom/buildElement';

export interface RunAsyncOptions {
    logger: Logger;
    root: HTMLElement;
    task: () => Promise<void>;
}

export const PanelStartup = {
    async runAsync({ logger, root, task }: RunAsyncOptions): Promise<void> {
        try {
            await task();
        } catch (error) {
            logger.error('Side panel startup failed.', error);
            root.replaceChildren(buildElement('p', {
                className: 'booting',
                text: `Rewire couldn't start: ${ErrorText.of(error)}`,
                attributes: {
                    role: 'alert',
                },
            }));
        }
    },
};
