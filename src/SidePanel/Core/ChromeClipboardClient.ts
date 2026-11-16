import { Result } from '../../Common/Results/Result';
import type { ClipboardClient } from './ClipboardClient';

export class ChromeClipboardClient implements ClipboardClient {
    copyAsync(text: string): Promise<Result<void>> {
        return Result.attemptAsync(() => navigator.clipboard.writeText(text), 'Copying failed');
    }
}
