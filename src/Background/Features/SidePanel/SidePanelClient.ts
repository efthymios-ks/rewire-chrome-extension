import { Result } from '../../../Common/Results/Result';

export interface SidePanelClient {
    openOnToolbarClickAsync(): Promise<Result<void>>;
}
