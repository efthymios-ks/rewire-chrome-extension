import type { Logger } from '../../Common/Logging/Logger';
import { ActiveProfile } from '../../Common/Profiles/ActiveProfile';
import { ProfileEdits } from '../../Common/Profiles/ProfileEdits';
import type { ImportMode } from '../../Common/Profiles/Transfer/ImportMode';
import { ProfileTransfer } from '../../Common/Profiles/Transfer/ProfileTransfer';
import { Result } from '../../Common/Results/Result';
import { RuleListEdits } from '../../Common/Rules/Editing/RuleListEdits';
import type { SettingsStorageClient } from '../../Common/Storage/SettingsStorageClient';
import type { Rule } from '../../Contracts/Rules/Rule';
import type { PanelSettings } from '../../Contracts/Settings/PanelSettings';
import type { ProfileVariable } from '../../Contracts/Settings/ProfileVariable';
import type { RuleProfile } from '../../Contracts/Settings/RuleProfile';
import type { Notifier } from './Notifier';
import { PANEL_LIMITS } from './PanelLimits';
import type { PanelState } from './PanelState';
import type { Store } from './Store';
import { StoreSync } from './StoreSync';

const UNDO_LABEL = 'Undo';
const LAST_PROFILE_MESSAGE = 'Keep at least one profile.';

type RulesChange = (rules: Rule[]) => Rule[];

export interface SettingsServiceDependencies {
    store: Store<PanelState>;
    storageClient: SettingsStorageClient;
    notifier: Notifier;
    logger: Logger;
}

export class SettingsService {
    private readonly _dependencies: SettingsServiceDependencies;

    constructor(dependencies: SettingsServiceDependencies) {
        this._dependencies = dependencies;
    }

    initializeAsync(): Promise<void> {
        const { store, storageClient, logger } = this._dependencies;

        return new StoreSync<PanelSettings>({
            store,
            source: storageClient,
            logFailure: message => logger.error(message),
            applyTo: (state, settings) => ({
                ...state,
                settings,
            }),
        }).startAsync();
    }

    current(): PanelSettings {
        return this._dependencies.store.getState().settings;
    }

    async updateAsync(change: (settings: PanelSettings) => PanelSettings): Promise<Result<void>> {
        const { store, storageClient, notifier, logger } = this._dependencies;
        const next = change(this.current());
        store.update(state => ({
            ...state,
            settings: next,
        }));

        const saved = await storageClient.saveAsync(next);
        if (saved.hasErrors) {
            logger.error(saved.error);
            notifier.show(saved.error);
        }

        return saved;
    }

    private updateRulesAsync(change: RulesChange): Promise<Result<void>> {
        return this.updateAsync(settings => ProfileEdits.changeActive(settings, profile => ({
            ...profile,
            rules: change(profile.rules),
        })));
    }

    activeRules(): Rule[] {
        return ActiveProfile.rules(this.current());
    }

    saveRuleAsync(rule: Rule): Promise<Result<void>> {
        return this.updateRulesAsync(rules => RuleListEdits.upsert(rules, rule));
    }

    setRuleEnabledAsync(ruleId: string, isEnabled: boolean): Promise<Result<void>> {
        return this.updateRulesAsync(rules => rules.map(rule => rule.id === ruleId
            ? {
                ...rule,
                enabled: isEnabled,
            }
            : rule));
    }

    duplicateRuleAsync(ruleId: string): Promise<Result<void>> {
        return this.updateRulesAsync(rules => {
            const rule = rules.find(candidate => candidate.id === ruleId);
            if (rule == null) {
                return rules;
            }

            return RuleListEdits.insertAfter({
                rules,
                rule: RuleListEdits.duplicate(
                    /* rule: */ rule,
                    /* newId: */ crypto.randomUUID(),
                ),
                afterRuleId: ruleId,
            });
        });
    }

    moveRuleAsync(ruleId: string, targetIndex: number): Promise<Result<void>> {
        return this.updateRulesAsync(rules => RuleListEdits.move({ rules, ruleId, targetIndex }));
    }

    async removeRuleAsync(ruleId: string): Promise<Result<void>> {
        const profileId = ActiveProfile.of(this.current()).id;
        const rules = this.activeRules();
        const index = rules.findIndex(rule => rule.id === ruleId);
        const rule = rules[index];
        if (rule == null) {
            return Result.done();
        }

        const removed = await this.updateRulesAsync(current => RuleListEdits.remove(current, ruleId));
        if (!removed.hasErrors) {
            this._dependencies.notifier.show(
                /* message: */ `Removed "${rule.name}".`,
                /* action: */ {
                    label: UNDO_LABEL,
                    run: () => void this.updateAsync(settings => ProfileEdits.change({
                        settings,
                        profileId,
                        change: profile => ({
                            ...profile,
                            rules: RuleListEdits.restore({ rules: profile.rules, rule, index }),
                        }),
                    })),
                },
            );
        }

        return removed;
    }

    importProfilesAsync(profiles: RuleProfile[], mode: ImportMode): Promise<Result<void>> {
        return this.updateAsync(settings => ProfileTransfer.apply({ settings, incoming: profiles, mode }));
    }

    createProfileAsync(): Promise<Result<void>> {
        return this.updateAsync(settings => ProfileEdits.create(
            /* settings: */ settings,
            /* profileId: */ crypto.randomUUID(),
        ));
    }

    renameProfileAsync(profileId: string, name: string): Promise<Result<void>> {
        return this.updateAsync(settings => ProfileEdits.rename({ settings, profileId, name }));
    }

    duplicateProfileAsync(profileId: string): Promise<Result<void>> {
        return this.updateAsync(settings => ProfileEdits.duplicate({
            settings,
            profileId,
            newProfileId: crypto.randomUUID(),
            newRuleId: () => crypto.randomUUID(),
        }));
    }

    async removeProfileAsync(profileId: string): Promise<Result<void>> {
        if (!ProfileEdits.canRemove(this.current())) {
            this._dependencies.notifier.show(LAST_PROFILE_MESSAGE);

            return Result.fail(LAST_PROFILE_MESSAGE);
        }

        return this.updateAsync(settings => ProfileEdits.remove(settings, profileId));
    }

    switchProfileAsync(profileId: string): Promise<Result<void>> {
        return this.updateAsync(settings => ProfileEdits.switchTo(settings, profileId));
    }

    saveVariablesAsync(variables: ProfileVariable[]): Promise<Result<void>> {
        return this.updateAsync(settings => ProfileEdits.changeActive(settings, profile => ({
            ...profile,
            variables,
        })));
    }

    async togglePinAsync(endpointKey: string): Promise<Result<void>> {
        const pinned = this.current().pinnedEndpoints;
        if (pinned.includes(endpointKey)) {
            return this.updateAsync(settings => ({
                ...settings,
                pinnedEndpoints: settings.pinnedEndpoints.filter(key => key !== endpointKey),
            }));
        }

        if (pinned.length >= PANEL_LIMITS.MaxPinnedEndpoints) {
            const message = `Pin up to ${PANEL_LIMITS.MaxPinnedEndpoints} endpoints. Unpin one first.`;
            this._dependencies.notifier.show(message);

            return Result.fail(message);
        }

        return this.updateAsync(settings => ({
            ...settings,
            pinnedEndpoints: [
                ...settings.pinnedEndpoints,
                endpointKey,
            ],
        }));
    }
}
