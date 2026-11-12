import type { PanelSettings } from "../../Contracts/Settings/PanelSettings";
import type { RuleProfile } from "../../Contracts/Settings/RuleProfile";
import { ActiveProfile } from "./ActiveProfile";

const NewProfileName = "Profile";
const CopySuffix = " copy";
const FirstNumberedCopy = 2;
const MinimumProfiles = 1;

type ProfileChange = (profile: RuleProfile) => RuleProfile;
type IdFactory = () => string;

function isTaken(settings: PanelSettings, name: string): boolean {
    return settings.profiles.some(profile => profile.name === name);
}

export const ProfileEdits = {
    change(
        settings: PanelSettings,
        profileId: string,
        change: ProfileChange
    ): PanelSettings {
        return {
            ...settings,
            profiles: settings.profiles.map(profile => profile.id === profileId ? change(profile) : profile),
        };
    },

    changeActive(settings: PanelSettings, change: ProfileChange): PanelSettings {
        return ProfileEdits.change(
            settings,
            ActiveProfile.of(settings).id,
            change
        );
    },

    uniqueName(settings: PanelSettings, baseName: string): string {
        if (!isTaken(settings, baseName)) {
            return baseName;
        }

        let number = FirstNumberedCopy;
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
                    name: ProfileEdits.uniqueName(settings, NewProfileName),
                    rules: [],
                    variables: [],
                },
            ],
        };
    },

    rename(
        settings: PanelSettings,
        profileId: string,
        name: string
    ): PanelSettings {
        const trimmed = name.trim();
        if (trimmed === "") {
            return settings;
        }

        return ProfileEdits.change(
            settings,
            profileId,
            profile => ({
                ...profile,
                name: trimmed,
            })
        );
    },

    duplicate(
        settings: PanelSettings,
        profileId: string,
        newProfileId: string,
        newRuleId: IdFactory
    ): PanelSettings {
        const index = settings.profiles.findIndex(profile => profile.id === profileId);
        const original = settings.profiles[index];
        if (original === undefined) {
            return settings;
        }

        const copy: RuleProfile = {
            id: newProfileId,
            name: ProfileEdits.uniqueName(settings, `${original.name}${CopySuffix}`),
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
        return settings.profiles.length > MinimumProfiles;
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
