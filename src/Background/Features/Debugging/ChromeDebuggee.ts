import { Result } from '../../../Common/Results/Result';
import type { CdpCommandName } from './CdpTypes/CdpCommandName';
import type { CdpCommandParams } from './CdpTypes/CdpCommandParams';
import type { CdpCommandReturn } from './CdpTypes/CdpCommandReturn';

const CDP_PROTOCOL_VERSION = '1.3';

export const ChromeDebuggee = {
    attachAsync(target: chrome.debugger.Debuggee): Promise<Result<void>> {
        return Result.attemptAsync(() => chrome.debugger.attach(
            /* target: */ target,
            /* requiredVersion: */ CDP_PROTOCOL_VERSION,
        ));
    },

    sendCommandAsync<TCommandName extends CdpCommandName>(
        target: chrome.debugger.DebuggerSession,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>> {
        const [commandParams] = params as unknown[];

        return Result.attemptAsync(
            /* action: */ async () => {
                const response = await chrome.debugger.sendCommand(
                    /* target: */ target,
                    /* method: */ command,
                    /* commandParams: */ commandParams as Record<string, unknown> | undefined,
                );

                return response as CdpCommandReturn<TCommandName>;
            },
            /* failurePrefix: */ `${command} failed`,
        );
    },
};
