import type { ProfileVariable } from "../../Contracts/Settings/ProfileVariable";
import { ErrorText } from "../Errors/ErrorText";
import { Result } from "../Results/Result";
import type { IRuleVariablesClient } from "./IRuleVariablesClient";
import { StorageAreaNames, StorageKeys } from "./StorageKeys";

function isVariable(value: unknown): value is ProfileVariable {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const record = value as Record<string, unknown>;

    return typeof record["name"] === "string" && typeof record["value"] === "string";
}

function asVariables(value: unknown): ProfileVariable[] {
    return Array.isArray(value) ? value.filter(isVariable) : [];
}

export class RuleVariablesClient implements IRuleVariablesClient {
    async load(): Promise<Result<ProfileVariable[]>> {
        try {
            const stored = await chrome.storage.session.get(StorageKeys.RuleVariables);

            return Result.ok(asVariables(stored[StorageKeys.RuleVariables]));
        } catch (error) {
            return Result.fail(`Loading captured variables failed: ${ErrorText.of(error)}`);
        }
    }

    subscribe(listener: (variables: ProfileVariable[]) => void): void {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            const change = changes[StorageKeys.RuleVariables];
            if (areaName !== StorageAreaNames.Session || change === undefined) {
                return;
            }

            listener(asVariables(change.newValue));
        });
    }
}
