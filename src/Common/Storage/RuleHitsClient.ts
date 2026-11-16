import type { RuleHit } from '../../Contracts/Rules/RuleHit';
import type { Result } from '../Results/Result';

export interface RuleHitsClient {
    loadAsync(): Promise<Result<RuleHit[]>>;
    saveAsync(hits: RuleHit[]): Promise<Result<void>>;
    subscribe(listener: (hits: RuleHit[]) => void): void;
}
