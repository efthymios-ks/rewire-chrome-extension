import type { Result } from '../../../Common/Results/Result';
import type { InspectionStatus } from '../../../Contracts/Inspection/InspectionStatus';

export interface InspectionService {
    inspectAsync(connectionId: string, tabId: number): Promise<Result<void>>;
    releaseAsync(tabId: number | null): Promise<void>;
    forget(tabId: number): void;
    refreshInterceptionAsync(): Promise<void>;
    handleDetach(tabId: number, reason: string): void;
    statusOf(tabId: number): InspectionStatus;
}
