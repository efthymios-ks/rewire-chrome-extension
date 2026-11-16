import { Result } from '../../Common/Results/Result';

export interface ClipboardClient {
    copyAsync(text: string): Promise<Result<void>>;
}
