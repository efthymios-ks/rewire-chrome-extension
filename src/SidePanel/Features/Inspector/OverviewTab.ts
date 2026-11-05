import { HeaderLookup } from "../../../Common/Http/HeaderLookup";
import { CookieHeader } from "../../../Common/Rules/Http/CookieHeader";
import { HeaderList } from "../../../Common/Rules/Http/HeaderList";
import { SetCookieHeader } from "../../../Common/Rules/Http/SetCookieHeader";
import { ChangeArea } from "../../../Contracts/Rules/ValueChange";
import type { SearchQuery } from "../../../Contracts/Search/SearchQuery";
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
import { SectionAccordion } from "./SectionAccordion";
import { SectionMemory } from "./SectionMemory";

const CookieHeaderName = "Cookie";
const SetCookieHeaderName = "Set-Cookie";

const SectionIds = {
    General: "general",
    RequestHeaders: "requestHeaders",
    RequestBody: "requestBody",
    ResponseHeaders: "responseHeaders",
    ResponseBody: "responseBody",
} as const;

function searchQueryOf(state: PanelState): SearchQuery | null {
    const search = state.search;

    return search.query.text === "" || search.error !== null ? null : search.query;
}

export class OverviewTab implements IInspectorTab {
    readonly id = InspectorTabId.Overview;
    readonly label = "Inspect";

    private readonly _context: PanelContext;
    private readonly _sectionMemory = new SectionMemory();

    constructor(context: PanelContext) {
        this._context = context;
    }

    keyOf(state: PanelState, detail: TimelineEntryDetail): string {
        const isPinned = state.settings.pinnedEndpoints.includes(detail.summary.endpointKey);

        return `${state.detailVersion}|${isPinned}|${JSON.stringify(searchQueryOf(state))}`;
    }

    render(detail: TimelineEntryDetail, state: PanelState): HTMLElement {
        const summary = detail.summary;
        const changes = detail.changes;
        const query = searchQueryOf(state);
        const appliedRules = AppliedRuleText.unique(summary.appliedRules);
        const sections = [
            DetailSections.section(
                SectionIds.General,
                "General",
                [
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
                ]
            ),
            DetailSections.section(
                SectionIds.RequestHeaders,
                `Request headers (${detail.requestHeaders.length})`,
                [
                    DetailSections.headers(
                        detail.requestHeaders,
                        changes,
                        ChangeArea.RequestHeader
                    ),
                    DetailSections.cookies(CookieHeader.parse(HeaderLookup.find(detail.requestHeaders, CookieHeaderName))),
                ]
            ),
            DetailSections.section(
                SectionIds.RequestBody,
                "Request body",
                [
                    DetailSections.body(
                        detail.requestBody,
                        null,
                        query,
                        DetailSections.changeOf(
                            changes,
                            ChangeArea.RequestBody,
                            "body"
                        )
                    ),
                ]
            ),
            DetailSections.section(
                SectionIds.ResponseHeaders,
                `Response headers (${detail.responseHeaders.length})`,
                [
                    DetailSections.headers(
                        detail.responseHeaders,
                        changes,
                        ChangeArea.ResponseHeader
                    ),
                    DetailSections.setCookies(HeaderList
                        .values(detail.responseHeaders, SetCookieHeaderName)
                        .map(value => SetCookieHeader.parse(value))),
                ]
            ),
            DetailSections.section(
                SectionIds.ResponseBody,
                "Response body",
                [
                    DetailSections.body(
                        detail.responseBody,
                        detail.responseBodyNote,
                        query,
                        DetailSections.changeOf(
                            changes,
                            ChangeArea.ResponseBody,
                            "body"
                        )
                    ),
                ]
            ),
        ];
        SectionAccordion.attach(
            sections,
            summary.id,
            this._sectionMemory
        );

        return buildElement("div", {
            className: "overview-tab",
            children: [
                this.actionsFor(detail),
                ...sections,
            ],
        });
    }

    private actionsFor(detail: TimelineEntryDetail): HTMLElement {
        const { settingsService, clipboardClient, notifier, ruleEditor } = this._context;
        const isPinned = settingsService.current().pinnedEndpoints.includes(detail.summary.endpointKey);
        const copy = async (text: string, message: string): Promise<void> => {
            const copied = await clipboardClient.copy(text);
            notifier.show(copied.hasErrors ? copied.error : message);
        };

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
                    onClick: () => void copy(detail.summary.url, "URL copied."),
                }),
                FormControls.button({
                    text: "Copy response body",
                    variant: ButtonVariants.Ghost,
                    onClick: () => void copy(detail.responseBody ?? "", "Response body copied."),
                }),
            ],
        });
    }
}
