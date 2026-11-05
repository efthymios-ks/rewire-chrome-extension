import { DefaultSnippetParts, type RequestSnapshot, type SnippetOptions } from "../../../Common/CodeGen/RequestSnapshot";
import { RequestSnapshots } from "../../../Common/CodeGen/RequestSnapshots";
import { SnippetChoices } from "../../../Common/CodeGen/SnippetChoices";
import { SnippetGenerators } from "../../../Common/CodeGen/SnippetGenerators";
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

const VariantValues = {
    Original: "original",
    Modified: "modified",
} as const;

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

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    keyOf(state: PanelState): string {
        return String(state.detailVersion);
    }

    render(detail: TimelineEntryDetail): HTMLElement {
        const preferences = CurrentInspectorPreferences;
        const hasChanges = RequestSnapshots.hasRequestChanges(detail.changes);
        let selection: SnippetOptions = {
            ...DefaultSnippetParts,
        };
        const snapshot = (): RequestSnapshot => DetailSnippets.snapshotOf(detail, hasChanges && preferences.useModified);
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
                snapshot(),
                preferences.generatorId,
                selection
            );
        };
        const collapseSnippet = (): void => {
            snippet.open = false;
        };
        const renderPickers = (): void => {
            const current = snapshot();
            pickers.replaceChildren(...PartGroups
                .map(group => ({
                    group,
                    choices: group.choicesOf(current),
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
        const variant = FormControls.select({
            value: preferences.useModified && hasChanges ? VariantValues.Modified : VariantValues.Original,
            options: [
                {
                    value: VariantValues.Original,
                    label: "As the page sent it",
                },
                {
                    value: VariantValues.Modified,
                    label: "After rules",
                },
            ],
            onChange: value => {
                preferences.useModified = value === VariantValues.Modified;
                collapseSnippet();
                renderPickers();
                refresh();
            },
        });
        variant.disabled = !hasChanges;
        variant.title = hasChanges ? "" : "No rule changed this request.";
        renderPickers();
        refresh();

        return buildElement("div", {
            className: "code-tab",
            children: [
                buildElement("div", {
                    className: "body-tools",
                    children: [
                        FormControls.select({
                            value: preferences.generatorId,
                            options: SnippetGenerators.all().map(generator => ({
                                value: generator.id,
                                label: generator.label,
                            })),
                            onChange: value => {
                                preferences.generatorId = value;
                                collapseSnippet();
                                refresh();
                            },
                        }),
                        variant,
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
