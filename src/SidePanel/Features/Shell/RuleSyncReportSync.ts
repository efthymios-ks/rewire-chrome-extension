import type { ILogger } from "../../../Common/Logging/ILogger";
import type { IRuleSyncReportClient } from "../../../Common/Storage/IRuleSyncReportClient";
import type { RuleSyncReport } from "../../../Contracts/RuleSync/RuleSyncReport";
import type { PanelState } from "../../Core/PanelState";
import type { Store } from "../../Core/Store";

export class RuleSyncReportSync {
    private readonly _store: Store<PanelState>;
    private readonly _reportClient: IRuleSyncReportClient;
    private readonly _logger: ILogger;

    constructor(
        store: Store<PanelState>,
        reportClient: IRuleSyncReportClient,
        logger: ILogger
    ) {
        this._store = store;
        this._reportClient = reportClient;
        this._logger = logger;
    }

    async start(): Promise<void> {
        this._reportClient.subscribe(report => this.apply(report));

        const loaded = await this._reportClient.load();
        if (loaded.hasErrors) {
            this._logger.error(loaded.error);

            return;
        }

        this.apply(loaded.value);
    }

    private apply(report: RuleSyncReport | null): void {
        this._store.update(state => ({
            ...state,
            ruleSyncReport: report,
        }));
    }
}
