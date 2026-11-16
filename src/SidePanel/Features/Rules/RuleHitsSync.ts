import type { Logger } from '../../../Common/Logging/Logger';
import type { RuleHitsClient } from '../../../Common/Storage/RuleHitsClient';
import type { RuleHit } from '../../../Contracts/Rules/RuleHit';
import type { PanelState } from '../../Core/PanelState';
import type { Store } from '../../Core/Store';
import { StoreSync } from '../../Core/StoreSync';

export interface RuleHitsSyncDependencies {
    store: Store<PanelState>;
    hitsClient: RuleHitsClient;
    logger: Logger;
}

export class RuleHitsSync extends StoreSync<RuleHit[]> {
    constructor({ store, hitsClient, logger }: RuleHitsSyncDependencies) {
        super({
            store,
            source: hitsClient,
            logFailure: message => logger.warn(message),
            applyTo: (state, hits) => ({
                ...state,
                ruleHits: Object.fromEntries(hits.map(hit => [
                    hit.ruleId,
                    hit.count,
                ])),
            }),
        });
    }
}
