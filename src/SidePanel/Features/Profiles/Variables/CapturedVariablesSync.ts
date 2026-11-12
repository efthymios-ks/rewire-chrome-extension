import type { ILogger } from "../../../../Common/Logging/ILogger";
import type { IRuleVariablesClient } from "../../../../Common/Storage/IRuleVariablesClient";
import type { ProfileVariable } from "../../../../Contracts/Settings/ProfileVariable";
import type { PanelState } from "../../../Core/PanelState";
import type { Store } from "../../../Core/Store";

export class CapturedVariablesSync {
    private readonly _store: Store<PanelState>;
    private readonly _variablesClient: IRuleVariablesClient;
    private readonly _logger: ILogger;

    constructor(
        store: Store<PanelState>,
        variablesClient: IRuleVariablesClient,
        logger: ILogger
    ) {
        this._store = store;
        this._variablesClient = variablesClient;
        this._logger = logger;
    }

    async start(): Promise<void> {
        this._variablesClient.subscribe(variables => this.apply(variables));

        const loaded = await this._variablesClient.load();
        if (loaded.hasErrors) {
            this._logger.warn(loaded.error);

            return;
        }

        this.apply(loaded.value);
    }

    private apply(variables: ProfileVariable[]): void {
        this._store.update(state => ({
            ...state,
            capturedVariables: variables,
        }));
    }
}
