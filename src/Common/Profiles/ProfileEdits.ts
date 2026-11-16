import type { PanelSettings } from '../../Contracts/Settings/PanelSettings';
import type { RuleProfile } from '../../Contracts/Settings/RuleProfile';
import { ActiveProfile } from './ActiveProfile';

const NEW_PROFILE_NAME = 'Profile';
const COPY_SUFFIX = ' copy';
const FIRST_NUMBERED_COPY = 2;
const MINIMUM_PROFILES = 1;

type ProfileChange = (profile: RuleProfile) => RuleProfile;
type IdFactory = () => string;

function isTaken(settings: PanelSettings, name: string): boolean {
    return settings.profiles.some(profile => profile.name === name);
}

export interface ChangeOptions {
    settings: PanelSettings;
    profileId: string;
    change: ProfileChange;
}

export interface RenameOptions {
    settings: PanelSettings;
    profileId: string;
    name: string;
}

export interface DuplicateOptions {
    settings: PanelSettings;
    profileId: string;
    newProfileId: string;
    newRuleId: IdFactory;
}

export const ProfileEdits = {
    change({ settings, profileId, change }: ChangeOptions): PanelSettings {
        return {
            ...settings,
            profiles: settings.profiles.map(profile => profile.id === profileId ? change(profile) : profile),
        };
    },

    changeActive(settings: PanelSettings, change: ProfileChange): PanelSettings {
        return ProfileEdits.change({ settings, profileId: ActiveProfile.of(settings).id, change });
    },

    uniqueName(settings: PanelSettings, baseName: string): string {
        if (!isTaken(settings, baseName)) {
            return baseName;
        }

        let number = FIRST_NUMBERED_COPY;
        while (isTaken(settings, `${baseName} ${number}`)) {
            number++;
        }

        return `${baseName} ${number}`;
    },

    create(settings: PanelSettings, profileId: string): PanelSettings {
        return {
            ...settings,
            activeProfileId: profileId,
            profiles: [
                ...settings.profiles,
                {
                    id: profileId,
                    name: ProfileEdits.uniqueName(settings, NEW_PROFILE_NAME),
                    rules: [],
                    variables: [],
                },
            ],
        };
    },

    rename({ settings, profileId, name }: RenameOptions): PanelSettings {
        const trimmed = name.trim();
        if (trimmed === '') {
            return settings;
        }

        return ProfileEdits.change({
            settings,
            profileId,
            change: profile => ({
                ...profile,
                name: trimmed,
            }),
        });
    },

    duplicate({ settings, profileId, newProfileId, newRuleId }: DuplicateOptions): PanelSettings {
        const index = settings.profiles.findIndex(profile => profile.id === profileId);
        const original = settings.profiles[index];
        if (original == null) {
            return settings;
        }

        const copy: RuleProfile = {
            id: newProfileId,
            name: ProfileEdits.uniqueName(settings, `${original.name}${COPY_SUFFIX}`),
            rules: original.rules.map(rule => ({
                ...rule,
                id: newRuleId(),
            })),
            variables: original.variables.map(variable => ({
                ...variable,
            })),
        };

        return {
            ...settings,
            profiles: [
                ...settings.profiles.slice(0, index + 1),
                copy,
                ...settings.profiles.slice(index + 1),
            ],
        };
    },

    canRemove(settings: PanelSettings): boolean {
        return settings.profiles.length > MINIMUM_PROFILES;
    },

    remove(settings: PanelSettings, profileId: string): PanelSettings {
        const index = settings.profiles.findIndex(profile => profile.id === profileId);
        if (index === -1 || !ProfileEdits.canRemove(settings)) {
            return settings;
        }

        const profiles = settings.profiles.filter(profile => profile.id !== profileId);
        const neighbour = profiles[Math.max(0, index - 1)]!;

        return {
            ...settings,
            activeProfileId: settings.activeProfileId === profileId ? neighbour.id : settings.activeProfileId,
            profiles,
        };
    },

    switchTo(settings: PanelSettings, profileId: string): PanelSettings {
        if (!settings.profiles.some(profile => profile.id === profileId)) {
            return settings;
        }

        return {
            ...settings,
            activeProfileId: profileId,
        };
    },
};
