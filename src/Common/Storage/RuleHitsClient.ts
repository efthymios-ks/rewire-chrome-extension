import type { RuleHit } from "../../Contracts/Rules/RuleHit";
import { ErrorText } from "../Errors/ErrorText";
import { Result } from "../Results/Result";
import type { IRuleHitsClient } from "./IRuleHitsClient";
import { StorageAreaNames, StorageKeys } from "./StorageKeys";

function isHit(value: unknown): value is RuleHit {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const record = value as Record<string, unknown>;

    return typeof record["ruleId"] === "string" && typeof record["count"] === "number";
}

function asHits(value: unknown): RuleHit[] {
    return Array.isArray(value) ? value.filter(isHit) : [];
}

export class RuleHitsClient implements IRuleHitsClient {
    async load(): Promise<Result<RuleHit[]>> {
        try {
            const stored = await chrome.storage.session.get(StorageKeys.RuleHits);

            return Result.ok(asHits(stored[StorageKeys.RuleHits]));
        } catch (error) {
            return Result.fail(`Loading rule hit counts failed: ${ErrorText.of(error)}`);
        }
    }

    async save(hits: RuleHit[]): Promise<Result<void>> {
        try {
            await chrome.storage.session.set({
                [StorageKeys.RuleHits]: hits,
            });

            return Result.done();
        } catch (error) {
            return Result.fail(`Saving rule hit counts failed: ${ErrorText.of(error)}`);
        }
    }

    subscribe(listener: (hits: RuleHit[]) => void): void {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            const change = changes[StorageKeys.RuleHits];
            if (areaName !== StorageAreaNames.Session || change === undefined) {
                return;
            }

            listener(asHits(change.newValue));
        });
    }
}
