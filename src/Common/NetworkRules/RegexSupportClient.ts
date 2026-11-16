import { Result } from '../Results/Result';

export interface RegexSupportClient {
    checkAsync(regex: string): Promise<Result<void>>;
}
