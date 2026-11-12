import { ChangeArea } from "../../../Contracts/Rules/ValueChange";
import { SearchFields } from "../../../Contracts/Search/SearchQuery";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { DurationText } from "../../Core/Formatting/DurationText";
import { StatusAppearance } from "../../Core/Formatting/StatusAppearance";
import { UtcText } from "../../Core/Formatting/UtcText";
import { InspectorTabId } from "../../Core/InspectorTabId";
import type { PanelState } from "../../Core/PanelState";
import { RuleFactory } from "../Rules/RuleFactory";
import type { PanelContext } from "../Shell/PanelContext";
import { AppliedRuleText } from "../Traffic/AppliedRuleText";
import { ContentKindLabels } from "../Traffic/ContentKindLabels";
import { DetailSections } from "./DetailSections";
import type { IInspectorTab } from "./IInspectorTab";

export class GeneralTab implements IInspectorTab {
    readonly id = InspectorTabId.General;
    readonly label = "General";
    readonly searchFields = [SearchFields.Url];

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    keyOf(state: PanelState, detail: TimelineEntryDetail): string {
        const isPinned = state.settings.pinnedEndpoints.includes(detail.summary.endpointKey);

        return `${state.detailVersion}|${isPinned}`;
    }

    render(detail: TimelineEntryDetail): HTMLElement {
        const summary = detail.summary;
        const changes = detail.changes;
        const appliedRules = AppliedRuleText.unique(summary.appliedRules);

        return buildElement("div", {
            className: "general-tab",
            children: [
                this.actionsFor(detail),
                DetailSections.definitions([
                    {
                        term: "URL",
                        value: summary.url,
                        change: DetailSections.changeOf(
                            changes,
                            ChangeArea.Url,
                            "url"
                        ),
                    },
                    {
                        term: "Method",
                        value: summary.method,
                    },
                    {
                        term: "Status",
                        value: StatusAppearance.describeOf(summary),
                        change: DetailSections.changeOf(
                            changes,
                            ChangeArea.Status,
                            "status"
                        ),
                    },
                    {
                        term: "Type",
                        value: `${summary.resourceType} ${ContentKindLabels[summary.contentKind]}`.trim(),
                    },
                    {
                        term: "Started",
                        value: UtcText.ofText(summary.startedAt),
                    },
                    {
                        term: "Duration",
                        value: DurationText.of(summary.durationInMilliseconds),
                    },
                    {
                        term: "Redirected from",
                        value: summary.redirectedFromUrl ?? "",
                    },
                    {
                        term: "Error",
                        value: summary.errorText ?? "",
                    },
                ]),
                appliedRules.length === 0
                    ? null
                    : buildElement("div", {
                        className: "applied-rules",
                        children: [
                            buildElement("h4", {
                                text: summary.isAnsweredByRule ? "Answered by rules" : "Applied rules",
                            }),
                            buildElement("ul", {
                                children: appliedRules.map(rule => buildElement("li", {
                                    text: AppliedRuleText.describe(rule),
                                })),
                            }),
                        ],
                    }),
            ],
        });
    }

    private actionsFor(detail: TimelineEntryDetail): HTMLElement {
        const { settingsService, clipboardClient, notifier, ruleEditor } = this._context;
        const isPinned = settingsService.current().pinnedEndpoints.includes(detail.summary.endpointKey);

        return buildElement("div", {
            className: "actions",
            children: [
                FormControls.button({
                    text: "Mock this",
                    variant: ButtonVariants.Primary,
                    title: "Open a mock rule prefilled from this response",
                    onClick: () => ruleEditor.open(RuleFactory.mockOf(detail), true),
                }),
                FormControls.button({
                    text: isPinned ? "Unpin" : "Pin",
                    onClick: () => void settingsService.togglePin(detail.summary.endpointKey),
                }),
                FormControls.button({
                    text: "Copy URL",
                    variant: ButtonVariants.Ghost,
                    onClick: () => void clipboardClient
                        .copy(detail.summary.url)
                        .then(copied => notifier.show(copied.hasErrors ? copied.error : "URL copied.")),
                }),
            ],
        });
    }
}
