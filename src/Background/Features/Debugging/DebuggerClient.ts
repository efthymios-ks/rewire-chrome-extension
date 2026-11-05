import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";
import type { CdpCommandName, CdpCommandParams, CdpCommandReturn } from "./CdpTypes";
import type { IDebuggerClient } from "./IDebuggerClient";

const ProtocolVersion = "1.3";

export class DebuggerClient implements IDebuggerClient {
    async attach(tabId: number): Promise<Result<void>> {
        try {
            await chrome.debugger.attach(
                {
                    tabId,
                },
                ProtocolVersion
            );

            return Result.done();
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }

    async detach(tabId: number): Promise<Result<void>> {
        try {
            await chrome.debugger.detach({
                tabId,
            });

            return Result.done();
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }

    async send<TCommandName extends CdpCommandName>(
        tabId: number,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>> {
        const [commandParams] = params as unknown[];
        try {
            const response = await chrome.debugger.sendCommand(
                {
                    tabId,
                },
                command,
                commandParams as Record<string, unknown> | undefined
            );

            return Result.ok(response as CdpCommandReturn<TCommandName>);
        } catch (error) {
            return Result.fail(`${command} failed: ${ErrorText.of(error)}`);
        }
    }
}
