import { Result } from '../../../Common/Results/Result';
import type { SidePanelClient } from './SidePanelClient';

export class ChromeSidePanelClient implements SidePanelClient {
    openOnToolbarClickAsync(): Promise<Result<void>> {
        return Result.attemptAsync(
            /* action: */ () => chrome.sidePanel.setPanelBehavior({
                openPanelOnActionClick: true,
            }),
            /* failurePrefix: */ 'Configuring the side panel failed',
        );
    }
}
