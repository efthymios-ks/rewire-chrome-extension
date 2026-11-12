import { DefaultSnippetParts, type RequestSnapshot, type SnippetOptions } from "../../../Common/CodeGen/RequestSnapshot";
import { RequestSnippets } from "../../../Common/CodeGen/RequestSnippets";
import { SnippetChoices } from "../../../Common/CodeGen/SnippetChoices";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { type PickChoice, PickList } from "../../Core/Dom/PickList";
import { InspectorTabId } from "../../Core/InspectorTabId";
import type { PanelState } from "../../Core/PanelState";
import type { PanelContext } from "../Shell/PanelContext";
import { DetailSnippets } from "./DetailSnippets";
import type { IInspectorTab } from "./IInspectorTab";
import { CurrentInspectorPreferences } from "./InspectorPreferences";

const BodyKey = "body";

interface PartGroup {
    label: string;
    choicesOf(snapshot: RequestSnapshot): PickChoice[];
    excludedOf(selection: SnippetOptions): string[];
    withExcluded(selection: SnippetOptions, excluded: string[]): SnippetOptions;
}

const PartGroups: PartGroup[] = [
    {
        label: "Headers",
        choicesOf: SnippetChoices.headersOf,
        excludedOf: selection => selection.excludedHeaders,
        withExcluded: (selection, excluded) => ({
            ...selection,
            excludedHeaders: excluded,
        }),
    },
    {
        label: "Cookies",
        choicesOf: SnippetChoices.cookiesOf,
        excludedOf: selection => selection.excludedCookies,
        withExcluded: (selection, excluded) => ({
            ...selection,
            excludedCookies: excluded,
        }),
    },
    {
        label: "Query params",
        choicesOf: SnippetChoices.queryParamsOf,
        excludedOf: selection => selection.excludedQueryParams,
        withExcluded: (selection, excluded) => ({
            ...selection,
            excludedQueryParams: excluded,
        }),
    },
    {
        label: "Body",
        choicesOf: snapshot => SnippetChoices.hasBody(snapshot)
            ? [
                {
                    key: BodyKey,
                    label: "Body",
                },
            ]
            : [],
        excludedOf: selection => selection.includeBody ? [] : [BodyKey],
        withExcluded: (selection, excluded) => ({
            ...selection,
            includeBody: !excluded.includes(BodyKey),
        }),
    },
];

export class CodeTab implements IInspectorTab {
    readonly id = InspectorTabId.Code;
    readonly label = "Code";
    readonly searchFields = [];

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    keyOf(state: PanelState): string {
        return String(state.detailVersion);
    }

    render(detail: TimelineEntryDetail): HTMLElement {
        const preferences = CurrentInspectorPreferences;
        let selection: SnippetOptions = {
            ...DefaultSnippetParts,
        };
        const snapshot: RequestSnapshot = DetailSnippets.snapshotOf(detail);
        const output = buildElement("pre", {
            className: "code-block wrap",
        });
        const snippet = buildElement("details", {
            className: "snippet-collapse",
            children: [
                buildElement("summary", {
                    text: "Show snippet",
                }),
                output,
            ],
        });
        const pickers = buildElement("div", {
            className: "code-parts",
        });
        const refresh = (): void => {
            output.textContent = DetailSnippets.of(
                snapshot,
                preferences.snippetId,
                selection
            );
        };
        const collapseSnippet = (): void => {
            snippet.open = false;
        };
        const renderPickers = (): void => {
            pickers.replaceChildren(...PartGroups
                .map(group => ({
                    group,
                    choices: group.choicesOf(snapshot),
                }))
                .filter(item => item.choices.length > 0)
                .map(item => PickList.build({
                    label: item.group.label,
                    choices: item.choices,
                    excluded: item.group.excludedOf(selection),
                    onChange: excluded => {
                        selection = item.group.withExcluded(selection, excluded);
                        refresh();
                    },
                })));
        };
        renderPickers();
        refresh();

        return buildElement("div", {
            className: "code-tab",
            children: [
                buildElement("div", {
                    className: "body-tools",
                    children: [
                        FormControls.select({
                            value: preferences.snippetId,
                            options: RequestSnippets.all().map(type => ({
                                value: type.id,
                                label: type.label,
                            })),
                            onChange: value => {
                                preferences.snippetId = value;
                                collapseSnippet();
                                refresh();
                            },
                        }),
                    ],
                }),
                buildElement("div", {
                    className: "body-tools",
                    children: [
                        pickers,
                        FormControls.button({
                            text: "Copy",
                            variant: ButtonVariants.Primary,
                            onClick: () => void this._context.clipboardClient
                                .copy(output.textContent ?? "")
                                .then(copied => this._context.notifier.show(copied.hasErrors ? copied.error : "Snippet copied.")),
                        }),
                    ],
                }),
                snippet,
            ],
        });
    }
}
