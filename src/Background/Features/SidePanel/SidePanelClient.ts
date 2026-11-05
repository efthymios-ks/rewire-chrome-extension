import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";

export interface ISidePanelClient {
    openOnToolbarClick(): Promise<Result<void>>;
}

export class SidePanelClient implements ISidePanelClient {
    async openOnToolbarClick(): Promise<Result<void>> {
        try {
            await chrome.sidePanel.setPanelBehavior({
                openPanelOnActionClick: true,
            });

            return Result.done();
        } catch (error) {
            return Result.fail(`Configuring the side panel failed: ${ErrorText.of(error)}`);
        }
    }
}
