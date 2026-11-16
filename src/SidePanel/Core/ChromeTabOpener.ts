import { Result } from '../../Common/Results/Result';
import type { TabOpener } from './TabOpener';

export class ChromeTabOpener implements TabOpener {
    openAsync(url: string): Promise<Result<void>> {
        return Result.attemptAsync(
            /* action: */ async () => {
                await chrome.tabs.create({
                    url,
                });
            },
            /* failurePrefix: */ `Can't open ${url}`,
        );
    }
}
