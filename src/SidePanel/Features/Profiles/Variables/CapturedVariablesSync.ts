import type { Logger } from '../../../../Common/Logging/Logger';
import type { RuleVariablesClient } from '../../../../Common/Storage/RuleVariablesClient';
import type { ProfileVariable } from '../../../../Contracts/Settings/ProfileVariable';
import type { PanelState } from '../../../Core/PanelState';
import type { Store } from '../../../Core/Store';
import { StoreSync } from '../../../Core/StoreSync';

export interface CapturedVariablesSyncDependencies {
    store: Store<PanelState>;
    variablesClient: RuleVariablesClient;
    logger: Logger;
}

export class CapturedVariablesSync extends StoreSync<ProfileVariable[]> {
    constructor({ store, variablesClient, logger }: CapturedVariablesSyncDependencies) {
        super({
            store,
            source: variablesClient,
            logFailure: message => logger.warn(message),
            applyTo: (state, capturedVariables) => ({
                ...state,
                capturedVariables,
            }),
        });
    }
}
