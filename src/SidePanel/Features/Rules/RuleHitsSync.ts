import type { ILogger } from "../../../Common/Logging/ILogger";
import type { IRuleHitsClient } from "../../../Common/Storage/IRuleHitsClient";
import type { RuleHit } from "../../../Contracts/Rules/RuleHit";
import type { PanelState } from "../../Core/PanelState";
import type { Store } from "../../Core/Store";

export class RuleHitsSync {
    private readonly _store: Store<PanelState>;
    private readonly _hitsClient: IRuleHitsClient;
    private readonly _logger: ILogger;

    constructor(
        store: Store<PanelState>,
        hitsClient: IRuleHitsClient,
        logger: ILogger
    ) {
        this._store = store;
        this._hitsClient = hitsClient;
        this._logger = logger;
    }

    async start(): Promise<void> {
        this._hitsClient.subscribe(hits => this.apply(hits));

        const loaded = await this._hitsClient.load();
        if (loaded.hasErrors) {
            this._logger.warn(loaded.error);

            return;
        }

        this.apply(loaded.value);
    }

    private apply(hits: RuleHit[]): void {
        this._store.update(state => ({
            ...state,
            ruleHits: Object.fromEntries(hits.map(hit => [
                hit.ruleId,
                hit.count,
            ])),
        }));
    }
}
