import type { ILogger } from "../../Common/Logging/ILogger";
import { Result } from "../../Common/Results/Result";
import { RuleListEdits } from "../../Common/Rules/Editing/RuleListEdits";
import type { ImportMode, RuleBundle } from "../../Common/Rules/Transfer/RuleBundle";
import { RuleTransfer } from "../../Common/Rules/Transfer/RuleTransfer";
import type { ISettingsStorageClient } from "../../Common/Storage/ISettingsStorageClient";
import type { Rule } from "../../Contracts/Rules/Rule";
import type { PanelSettings } from "../../Contracts/Settings/PanelSettings";
import type { Notifier } from "./Notifier";
import { PanelLimits } from "./PanelLimits";
import type { PanelState } from "./PanelState";
import type { Store } from "./Store";

const UndoLabel = "Undo";

export interface SettingsServiceDependencies {
    store: Store<PanelState>;
    storageClient: ISettingsStorageClient;
    notifier: Notifier;
    logger: ILogger;
}

export class SettingsService {
    private readonly _dependencies: SettingsServiceDependencies;

    constructor(dependencies: SettingsServiceDependencies) {
        this._dependencies = dependencies;
    }

    async initialize(): Promise<void> {
        const { store, storageClient, logger } = this._dependencies;
        storageClient.subscribe(settings => store.update(state => ({
            ...state,
            settings,
        })));

        const loaded = await storageClient.load();
        if (loaded.hasErrors) {
            logger.error(loaded.error);

            return;
        }

        store.update(state => ({
            ...state,
            settings: loaded.value,
        }));
    }

    current(): PanelSettings {
        return this._dependencies.store.getState().settings;
    }

    async update(change: (settings: PanelSettings) => PanelSettings): Promise<Result<void>> {
        const { store, storageClient, notifier, logger } = this._dependencies;
        const next = change(this.current());
        store.update(state => ({
            ...state,
            settings: next,
        }));

        const saved = await storageClient.save(next);
        if (saved.hasErrors) {
            logger.error(saved.error);
            notifier.show(saved.error);
        }

        return saved;
    }

    saveRule(rule: Rule): Promise<Result<void>> {
        return this.update(settings => ({
            ...settings,
            rules: RuleListEdits.replace(settings.rules, rule),
        }));
    }

    setRuleEnabled(ruleId: string, enabled: boolean): Promise<Result<void>> {
        return this.update(settings => ({
            ...settings,
            rules: settings.rules.map(rule => rule.id === ruleId
                ? {
                    ...rule,
                    enabled,
                }
                : rule),
        }));
    }

    duplicateRule(ruleId: string): Promise<Result<void>> {
        return this.update(settings => {
            const rule = settings.rules.find(candidate => candidate.id === ruleId);
            if (rule === undefined) {
                return settings;
            }

            return {
                ...settings,
                rules: RuleListEdits.insertAfter(
                    settings.rules,
                    RuleListEdits.duplicate(rule, crypto.randomUUID()),
                    ruleId
                ),
            };
        });
    }

    moveRule(ruleId: string, targetIndex: number): Promise<Result<void>> {
        return this.update(settings => ({
            ...settings,
            rules: RuleListEdits.move(
                settings.rules,
                ruleId,
                targetIndex
            ),
        }));
    }

    async removeRule(ruleId: string): Promise<Result<void>> {
        const index = this.current().rules.findIndex(rule => rule.id === ruleId);
        const rule = this.current().rules[index];
        if (rule === undefined) {
            return Result.done();
        }

        const removed = await this.update(settings => ({
            ...settings,
            rules: RuleListEdits.remove(settings.rules, ruleId),
        }));
        if (!removed.hasErrors) {
            this._dependencies.notifier.show(
                `Removed "${rule.name}".`,
                {
                    label: UndoLabel,
                    run: () => void this.update(settings => ({
                        ...settings,
                        rules: RuleListEdits.restore(
                            settings.rules,
                            rule,
                            index
                        ),
                    })),
                }
            );
        }

        return removed;
    }

    importBundle(bundle: RuleBundle, mode: ImportMode): Promise<Result<void>> {
        return this.update(settings => RuleTransfer.apply(
            settings,
            bundle,
            mode
        ));
    }

    async togglePin(endpointKey: string): Promise<Result<void>> {
        const pinned = this.current().pinnedEndpoints;
        if (pinned.includes(endpointKey)) {
            return this.update(settings => ({
                ...settings,
                pinnedEndpoints: settings.pinnedEndpoints.filter(key => key !== endpointKey),
            }));
        }

        if (pinned.length >= PanelLimits.MaxPinnedEndpoints) {
            const message = `Pin up to ${PanelLimits.MaxPinnedEndpoints} endpoints. Unpin one first.`;
            this._dependencies.notifier.show(message);

            return Result.fail(message);
        }

        return this.update(settings => ({
            ...settings,
            pinnedEndpoints: [
                ...settings.pinnedEndpoints,
                endpointKey,
            ],
        }));
    }
}
