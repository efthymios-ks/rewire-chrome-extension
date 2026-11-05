import { ErrorText } from "../../../Common/Errors/ErrorText";
import type { ILogger } from "../../../Common/Logging/ILogger";
import { StorageKeys } from "../../../Common/Storage/StorageKeys";

interface StoredVariable {
    name: string;
    value: string;
}

export interface IVariableStore {
    get(name: string): string | null;
    set(name: string, value: string): void;
    snapshot(): Map<string, string>;
    subscribe(listener: () => void): void;
}

function isStoredVariable(value: unknown): value is StoredVariable {
    return typeof value === "object"
        && value !== null
        && typeof (value as StoredVariable).name === "string"
        && typeof (value as StoredVariable).value === "string";
}

export class VariableStore implements IVariableStore {
    private readonly _values = new Map<string, string>();
    private readonly _listeners: Array<() => void> = [];
    private readonly _logger: ILogger;

    constructor(logger: ILogger) {
        this._logger = logger;
    }

    async initialize(): Promise<void> {
        try {
            const stored = await chrome.storage.session.get(StorageKeys.RuleVariables);
            const variables = stored[StorageKeys.RuleVariables];
            if (Array.isArray(variables)) {
                variables
                    .filter(isStoredVariable)
                    .forEach(variable => this._values.set(variable.name, variable.value));
            }
        } catch (error) {
            this._logger.warn("Loading rule variables failed.", ErrorText.of(error));
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
        void this.persist();
        this._listeners.forEach(listener => listener());
    }

    snapshot(): Map<string, string> {
        return new Map(this._values);
    }

    subscribe(listener: () => void): void {
        this._listeners.push(listener);
    }

    private async persist(): Promise<void> {
        const variables: StoredVariable[] = [...this._values.entries()].map(([name, value]) => ({
            name,
            value,
        }));
        try {
            await chrome.storage.session.set({
                [StorageKeys.RuleVariables]: variables,
            });
        } catch (error) {
            this._logger.warn("Saving rule variables failed.", ErrorText.of(error));
        }
    }
}
