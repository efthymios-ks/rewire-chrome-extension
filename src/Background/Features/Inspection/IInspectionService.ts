import type { Result } from "../../../Common/Results/Result";
import type { InspectionStatus } from "../../../Contracts/Inspection/InspectionStatus";

export interface IInspectionService {
    inspect(connectionId: string, tabId: number): Promise<Result<void>>;
    release(tabId: number | null): Promise<void>;
    forget(tabId: number): void;
    refreshInterception(): Promise<void>;
    handleDetach(tabId: number, reason: string): void;
    statusOf(tabId: number): InspectionStatus;
}
