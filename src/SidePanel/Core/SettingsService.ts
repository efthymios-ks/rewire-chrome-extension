import type { ILogger } from "../../Common/Logging/ILogger";
import { ActiveProfile } from "../../Common/Profiles/ActiveProfile";
import { ProfileEdits } from "../../Common/Profiles/ProfileEdits";
import type { ImportMode } from "../../Common/Profiles/Transfer/ProfileBundle";
import { ProfileTransfer } from "../../Common/Profiles/Transfer/ProfileTransfer";
import { Result } from "../../Common/Results/Result";
import { RuleListEdits } from "../../Common/Rules/Editing/RuleListEdits";
import type { ISettingsStorageClient } from "../../Common/Storage/ISettingsStorageClient";
import type { Rule } from "../../Contracts/Rules/Rule";
import type { PanelSettings } from "../../Contracts/Settings/PanelSettings";
import type { ProfileVariable } from "../../Contracts/Settings/ProfileVariable";
import type { RuleProfile } from "../../Contracts/Settings/RuleProfile";
import type { Notifier } from "./Notifier";
import { PanelLimits } from "./PanelLimits";
import type { PanelState } from "./PanelState";
import type { Store } from "./Store";

const UndoLabel = "Undo";
const LastProfileMessage = "Keep at least one profile.";

type RulesChange = (rules: Rule[]) => Rule[];

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

    private updateRules(change: RulesChange): Promise<Result<void>> {
        return this.update(settings => ProfileEdits.changeActive(settings, profile => ({
            ...profile,
            rules: change(profile.rules),
        })));
    }

    activeRules(): Rule[] {
        return ActiveProfile.rules(this.current());
    }

    saveRule(rule: Rule): Promise<Result<void>> {
        return this.updateRules(rules => RuleListEdits.replace(rules, rule));
    }

    setRuleEnabled(ruleId: string, enabled: boolean): Promise<Result<void>> {
        return this.updateRules(rules => rules.map(rule => rule.id === ruleId
            ? {
                ...rule,
                enabled,
            }
            : rule));
    }

    duplicateRule(ruleId: string): Promise<Result<void>> {
        return this.updateRules(rules => {
            const rule = rules.find(candidate => candidate.id === ruleId);
            if (rule === undefined) {
                return rules;
            }

            return RuleListEdits.insertAfter(
                rules,
                RuleListEdits.duplicate(rule, crypto.randomUUID()),
                ruleId
            );
        });
    }

    moveRule(ruleId: string, targetIndex: number): Promise<Result<void>> {
        return this.updateRules(rules => RuleListEdits.move(
            rules,
            ruleId,
            targetIndex
        ));
    }

    async removeRule(ruleId: string): Promise<Result<void>> {
        const profileId = ActiveProfile.of(this.current()).id;
        const rules = this.activeRules();
        const index = rules.findIndex(rule => rule.id === ruleId);
        const rule = rules[index];
        if (rule === undefined) {
            return Result.done();
        }

        const removed = await this.updateRules(current => RuleListEdits.remove(current, ruleId));
        if (!removed.hasErrors) {
            this._dependencies.notifier.show(
                `Removed "${rule.name}".`,
                {
                    label: UndoLabel,
                    run: () => void this.update(settings => ProfileEdits.change(
                        settings,
                        profileId,
                        profile => ({
                            ...profile,
                            rules: RuleListEdits.restore(
                                profile.rules,
                                rule,
                                index
                            ),
                        })
                    )),
                }
            );
        }

        return removed;
    }

    importProfiles(profiles: RuleProfile[], mode: ImportMode): Promise<Result<void>> {
        return this.update(settings => ProfileTransfer.apply(
            settings,
            profiles,
            mode
        ));
    }

    createProfile(): Promise<Result<void>> {
        return this.update(settings => ProfileEdits.create(settings, crypto.randomUUID()));
    }

    renameProfile(profileId: string, name: string): Promise<Result<void>> {
        return this.update(settings => ProfileEdits.rename(
            settings,
            profileId,
            name
        ));
    }

    duplicateProfile(profileId: string): Promise<Result<void>> {
        return this.update(settings => ProfileEdits.duplicate(
            settings,
            profileId,
            crypto.randomUUID(),
            () => crypto.randomUUID()
        ));
    }

    async removeProfile(profileId: string): Promise<Result<void>> {
        if (!ProfileEdits.canRemove(this.current())) {
            this._dependencies.notifier.show(LastProfileMessage);

            return Result.fail(LastProfileMessage);
        }

        return this.update(settings => ProfileEdits.remove(settings, profileId));
    }

    switchProfile(profileId: string): Promise<Result<void>> {
        return this.update(settings => ProfileEdits.switchTo(settings, profileId));
    }

    saveVariables(variables: ProfileVariable[]): Promise<Result<void>> {
        return this.update(settings => ProfileEdits.changeActive(settings, profile => ({
            ...profile,
            variables,
        })));
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
