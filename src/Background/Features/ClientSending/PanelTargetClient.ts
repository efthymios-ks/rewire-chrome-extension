import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";
import type { CdpCommandName, CdpCommandParams, CdpCommandReturn } from "../Debugging/CdpTypes";
import type { IPanelTargetClient } from "./IPanelTargetClient";

const ProtocolVersion = "1.3";
const PanelPath = "sidepanel/";

export class PanelTargetClient implements IPanelTargetClient {
    async findPanelTarget(): Promise<string | null> {
        const panelUrl = chrome.runtime.getURL(PanelPath);
        const targets = await chrome.debugger.getTargets();
        const panel = targets.find(target => target.tabId === undefined && target.url.startsWith(panelUrl));

        return panel?.id ?? null;
    }

    async attach(targetId: string): Promise<Result<void>> {
        try {
            await chrome.debugger.attach(
                {
                    targetId,
                },
                ProtocolVersion
            );

            return Result.done();
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }

    async send<TCommandName extends CdpCommandName>(
        targetId: string,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>> {
        const [commandParams] = params as unknown[];
        try {
            const response = await chrome.debugger.sendCommand(
                {
                    targetId,
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
