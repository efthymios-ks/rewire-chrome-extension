import { Result } from '../../Common/Results/Result';

export interface TabOpener {
    openAsync(url: string): Promise<Result<void>>;
}
