import { ActiveProfile } from "../../Common/Profiles/ActiveProfile";
import { ProfileVariables } from "../../Common/Profiles/ProfileVariables";
import { TemplateText } from "../../Common/Rules/Templates/TemplateText";
import type { PanelState } from "./PanelState";

export const PanelVariables = {
    render(state: PanelState, text: string): string {
        const values = ProfileVariables.mapOf([
            ...ActiveProfile.variables(state.settings),
            ...state.capturedVariables,
        ]);

        return TemplateText.render(text, name => values.get(name) ?? null);
    },
};
