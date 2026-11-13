import type { Result } from "../../../Common/Results/Result";

export interface ISessionStep {
    readonly name: string;
    readonly isRequired: boolean;
    apply(tabId: number, sessionId: string | null): Promise<Result<void>>;
}
