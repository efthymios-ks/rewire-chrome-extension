import { Result } from '../../../Common/Results/Result';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';

export interface HandshakeHeaderRules {
    startAsync(): Promise<void>;
    addAsync(url: string, headers: HeaderEntry[]): Promise<Result<number>>;
    removeAsync(ruleId: number): Promise<void>;
}
