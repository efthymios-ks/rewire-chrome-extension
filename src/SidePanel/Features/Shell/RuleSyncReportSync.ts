import type { Logger } from '../../../Common/Logging/Logger';
import type { RuleSyncReportClient } from '../../../Common/Storage/RuleSyncReportClient';
import type { RuleSyncReport } from '../../../Contracts/RuleSync/RuleSyncReport';
import type { PanelState } from '../../Core/PanelState';
import type { Store } from '../../Core/Store';
import { StoreSync } from '../../Core/StoreSync';

export interface RuleSyncReportSyncDependencies {
    store: Store<PanelState>;
    reportClient: RuleSyncReportClient;
    logger: Logger;
}

export class RuleSyncReportSync extends StoreSync<RuleSyncReport | null> {
    constructor({ store, reportClient, logger }: RuleSyncReportSyncDependencies) {
        super({
            store,
            source: reportClient,
            logFailure: message => logger.error(message),
            applyTo: (state, report) => ({
                ...state,
                ruleSyncReport: report,
            }),
        });
    }
}
