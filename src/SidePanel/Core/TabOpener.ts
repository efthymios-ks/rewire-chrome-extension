import { ErrorText } from "../../Common/Errors/ErrorText";
import { Result } from "../../Common/Results/Result";

export interface ITabOpener {
    open(url: string): Promise<Result<void>>;
}

export class TabOpener implements ITabOpener {
    async open(url: string): Promise<Result<void>> {
        try {
            await chrome.tabs.create({
                url,
            });

            return Result.done();
        } catch (error) {
            return Result.fail(`Can't open ${url}: ${ErrorText.of(error)}`);
        }
    }
}
