import { ErrorText } from "../../Common/Errors/ErrorText";
import { Result } from "../../Common/Results/Result";

export interface IClipboardClient {
    copy(text: string): Promise<Result<void>>;
}

export class ClipboardClient implements IClipboardClient {
    async copy(text: string): Promise<Result<void>> {
        try {
            await navigator.clipboard.writeText(text);

            return Result.done();
        } catch (error) {
            return Result.fail(`Copying failed: ${ErrorText.of(error)}`);
        }
    }
}
