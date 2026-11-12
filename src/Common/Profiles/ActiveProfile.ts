import type { Rule } from "../../Contracts/Rules/Rule";
import { DefaultProfile } from "../../Contracts/Settings/DefaultPanelSettings";
import type { PanelSettings } from "../../Contracts/Settings/PanelSettings";
import type { ProfileVariable } from "../../Contracts/Settings/ProfileVariable";
import type { RuleProfile } from "../../Contracts/Settings/RuleProfile";

export const ActiveProfile = {
    of(settings: PanelSettings): RuleProfile {
        return settings.profiles.find(profile => profile.id === settings.activeProfileId)
            ?? settings.profiles[0]
            ?? DefaultProfile;
    },

    rules(settings: PanelSettings): Rule[] {
        return ActiveProfile.of(settings).rules;
    },

    variables(settings: PanelSettings): ProfileVariable[] {
        return ActiveProfile.of(settings).variables;
    },
};
