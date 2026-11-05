import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import { InspectionState } from "../../../Contracts/Inspection/InspectionState";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { InputSync } from "../../Core/Dom/InputSync";
import type { InspectedTab } from "../../Core/InspectedTab";
import type { PanelContext } from "./PanelContext";
import { ThemeToggle } from "./ThemeToggle";

const StatusLabels: Record<InspectionState, string> = {
    [InspectionState.Idle]: "No tab",
    [InspectionState.Attaching]: "Attaching",
    [InspectionState.Attached]: "Capturing",
    [InspectionState.Detached]: "Detached",
    [InspectionState.Failed]: "Failed",
};

const ReattachableStates = [
    InspectionState.Detached,
    InspectionState.Failed,
];

function hostOf(tab: InspectedTab | null): string {
    if (tab === null) {
        return "No tab";
    }

    return SafeUrl.parse(tab.url)?.host || tab.title || "This tab";
}

export class HeaderBar {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        const host = buildElement("span", {
            className: "header-host",
        });
        const statusPill = buildElement("span", {
            className: "status-pill",
        });
        const reattachButton = FormControls.button({
            text: "Reattach",
            variant: ButtonVariants.Ghost,
            onClick: () => void context.timelineSync.reinspect(),
        });
        const killSwitch = FormControls.toggleSwitch({
            checked: context.settingsService.current().interceptionEnabled,
            label: "Interception",
            onChange: checked => void context.settingsService.update(settings => ({
                ...settings,
                interceptionEnabled: checked,
            })),
        });
        killSwitch.title = "Turns every rule on or off at once.";
        const killSwitchInput = killSwitch.querySelector("input")!;

        this.root = buildElement("header", {
            className: "header-bar",
            children: [
                buildElement("h1", {
                    className: "brand",
                    text: "Rewire",
                }),
                buildElement("div", {
                    className: "header-target",
                    children: [
                        host,
                        statusPill,
                        reattachButton,
                    ],
                }),
                new ThemeToggle(context).root,
                killSwitch,
            ],
        });

        context.store.select(
            state => state.inspectedTab,
            tab => {
                host.textContent = hostOf(tab);
                host.title = tab?.url ?? "";
            }
        );

        context.store.select(
            state => state.inspection,
            inspection => {
                statusPill.textContent = StatusLabels[inspection.state];
                statusPill.dataset["state"] = String(inspection.state);
                statusPill.title = inspection.message;
                reattachButton.hidden = !ReattachableStates.includes(inspection.state);
            }
        );

        context.store.select(
            state => state.settings.interceptionEnabled,
            isEnabled => {
                InputSync.setChecked(killSwitchInput, isEnabled);
                this.root.classList.toggle("interception-off", !isEnabled);
            }
        );
    }
}
