import type { RuleHit } from "../../Contracts/Rules/RuleHit";
import type { Result } from "../Results/Result";

export interface IRuleHitsClient {
    load(): Promise<Result<RuleHit[]>>;
    save(hits: RuleHit[]): Promise<Result<void>>;
    subscribe(listener: (hits: RuleHit[]) => void): void;
}
