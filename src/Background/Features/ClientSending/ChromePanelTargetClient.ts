import { Result } from '../../../Common/Results/Result';
import type { CdpCommandName } from '../Debugging/CdpTypes/CdpCommandName';
import type { CdpCommandParams } from '../Debugging/CdpTypes/CdpCommandParams';
import type { CdpCommandReturn } from '../Debugging/CdpTypes/CdpCommandReturn';
import { ChromeDebuggee } from '../Debugging/ChromeDebuggee';
import type { PanelTargetClient } from './PanelTargetClient';

const PANEL_PATH = 'sidepanel/';

export class ChromePanelTargetClient implements PanelTargetClient {
    findPanelTargetAsync(): Promise<Result<string | null>> {
        return Result.attemptAsync(async () => {
            const panelUrl = chrome.runtime.getURL(PANEL_PATH);
            const targets = await chrome.debugger.getTargets();
            const panel = targets.find(target => target.tabId == null && target.url.startsWith(panelUrl));

            return panel?.id ?? null;
        });
    }

    async attachAsync(targetId: string): Promise<Result<void>> {
        return ChromeDebuggee.attachAsync({
            targetId,
        });
    }

    async sendAsync<TCommandName extends CdpCommandName>(
        targetId: string,
        command: TCommandName,
        ...params: CdpCommandParams<TCommandName>
    ): Promise<Result<CdpCommandReturn<TCommandName>>> {
        return ChromeDebuggee.sendCommandAsync(
            /* target: */ {
                targetId,
            },
            /* command: */ command,
            /* params: */ ...params,
        );
    }
}
