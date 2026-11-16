import { ErrorText } from '../../../Common/Errors/ErrorText';
import type { Logger } from '../../../Common/Logging/Logger';
import { STORAGE_KEYS } from '../../../Common/Storage/StorageKeys';
import type { VariableStore } from './VariableStore';

interface StoredVariable {
    name: string;
    value: string;
}

function isStoredVariable(value: unknown): value is StoredVariable {
    return typeof value === 'object'
        && value != null
        && typeof (value as StoredVariable).name === 'string'
        && typeof (value as StoredVariable).value === 'string';
}

export class DefaultVariableStore implements VariableStore {
    private readonly _values = new Map<string, string>();
    private readonly _listeners: Array<() => void> = [];
    private readonly _logger: Logger;

    constructor(logger: Logger) {
        this._logger = logger;
    }

    async initializeAsync(): Promise<void> {
        try {
            const stored = await chrome.storage.session.get(STORAGE_KEYS.RuleVariables);
            const variables = stored[STORAGE_KEYS.RuleVariables];
            if (Array.isArray(variables)) {
                variables
                    .filter(isStoredVariable)
                    .forEach(variable => this._values.set(variable.name, variable.value));
            }
        } catch (error) {
            this._logger.warn(
                /* message: */ 'Loading rule variables failed.',
                /* context: */ ErrorText.of(error),
            );
        }
    }

    get(name: string): string | null {
        return this._values.get(name) ?? null;
    }

    set(name: string, value: string): void {
        if (this._values.get(name) === value) {
            return;
        }

        this._values.set(name, value);
        void this.persistAsync();
        this._listeners.forEach(listener => listener());
    }

    snapshot(): Map<string, string> {
        return new Map(this._values);
    }

    subscribe(listener: () => void): void {
        this._listeners.push(listener);
    }

    private async persistAsync(): Promise<void> {
        const variables: StoredVariable[] = [...this._values.entries()].map(([name, value]) => ({
            name,
            value,
        }));
        try {
            await chrome.storage.session.set({
                [STORAGE_KEYS.RuleVariables]: variables,
            });
        } catch (error) {
            this._logger.warn(
                /* message: */ 'Saving rule variables failed.',
                /* context: */ ErrorText.of(error),
            );
        }
    }
}
