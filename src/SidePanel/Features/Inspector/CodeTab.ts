import { DEFAULT_SNIPPET_PARTS } from '../../../Common/CodeGen/DefaultSnippetParts';
import type { RequestSnapshot } from '../../../Common/CodeGen/RequestSnapshot';
import { RequestSnippets } from '../../../Common/CodeGen/RequestSnippets';
import { SnippetChoices } from '../../../Common/CodeGen/SnippetChoices';
import type { SnippetOptions } from '../../../Common/CodeGen/SnippetOptions';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import { copyWithNoticeAsync } from '../../Core/copyWithNoticeAsync';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import { type PickChoice, PickList } from '../../Core/Dom/PickList';
import { INSPECTOR_TAB_ID } from '../../Core/InspectorTabId';
import type { PanelState } from '../../Core/PanelState';
import type { PanelContext } from '../Shell/PanelContext';
import { DetailSnippets } from './DetailSnippets';
import type { InspectorTab } from './InspectorTab';
import { sessionInspectorPreferences } from './sessionInspectorPreferences';

const BODY_KEY = 'body';

interface PartGroup {
    label: string;
    choicesOf(snapshot: RequestSnapshot): PickChoice[];
    excludedOf(selection: SnippetOptions): string[];
    withExcluded(selection: SnippetOptions, excluded: string[]): SnippetOptions;
}

const PART_GROUPS: PartGroup[] = [
    {
        label: 'Headers',
        choicesOf: SnippetChoices.headersOf,
        excludedOf: selection => selection.excludedHeaders,
        withExcluded: (selection, excluded) => ({
            ...selection,
            excludedHeaders: excluded,
        }),
    },
    {
        label: 'Cookies',
        choicesOf: SnippetChoices.cookiesOf,
        excludedOf: selection => selection.excludedCookies,
        withExcluded: (selection, excluded) => ({
            ...selection,
            excludedCookies: excluded,
        }),
    },
    {
        label: 'Query params',
        choicesOf: SnippetChoices.queryParamsOf,
        excludedOf: selection => selection.excludedQueryParams,
        withExcluded: (selection, excluded) => ({
            ...selection,
            excludedQueryParams: excluded,
        }),
    },
    {
        label: 'Body',
        choicesOf: snapshot => SnippetChoices.hasBody(snapshot)
            ? [
                {
                    key: BODY_KEY,
                    label: 'Body',
                },
            ]
            : [],
        excludedOf: selection => selection.shouldIncludeBody ? [] : [BODY_KEY],
        withExcluded: (selection, excluded) => ({
            ...selection,
            shouldIncludeBody: !excluded.includes(BODY_KEY),
        }),
    },
];

export class CodeTab implements InspectorTab {
    readonly id = INSPECTOR_TAB_ID.Code;
    readonly label = 'Code';
    readonly searchFields = [];

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    keyOf(state: PanelState): string {
        return String(state.detailVersion);
    }

    render(detail: TimelineEntryDetail): HTMLElement {
        const preferences = sessionInspectorPreferences;
        let selection: SnippetOptions = {
            ...DEFAULT_SNIPPET_PARTS,
        };
        const snapshot: RequestSnapshot = DetailSnippets.snapshotOf(detail);
        const output = buildElement('pre', {
            className: 'code-block',
            attributes: { 'data-wrap': '' },
        });
        const snippet = buildElement('details', {
            className: 'snippet-collapse',
            children: [
                buildElement('summary', {
                    text: 'Show snippet',
                }),
                output,
            ],
        });
        const pickers = buildElement('div', {
            className: 'code-parts',
        });
        const refresh = (): void => {
            output.textContent = DetailSnippets.of({
                snapshot,
                snippetId: preferences.snippetId,
                options: selection,
            });
        };
        const collapseSnippet = (): void => {
            snippet.open = false;
        };
        const renderPickers = (): void => {
            pickers.replaceChildren(...PART_GROUPS
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

        return buildElement('div', {
            className: 'code-tab',
            children: [
                buildElement('div', {
                    className: 'body-tools',
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
                buildElement('div', {
                    className: 'body-tools',
                    children: [
                        pickers,
                        FormControls.button({
                            text: 'Copy',
                            variant: BUTTON_VARIANTS.Primary,
                            onClick: () => copyWithNoticeAsync({
                                context: this._context,
                                text: output.textContent ?? '',
                                successMessage: 'Snippet copied.',
                            }),
                        }),
                    ],
                }),
                snippet,
            ],
        });
    }
}
