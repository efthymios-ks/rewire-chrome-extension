import { JsonText } from '../../../Common/Json/JsonText';
import type { CookiePair } from '../../../Common/Rules/Http/CookiePair';
import type { SetCookie } from '../../../Common/Rules/Http/SetCookie';
import type { ChangeArea } from '../../../Contracts/Rules/ChangeArea';
import type { ValueChange } from '../../../Contracts/Rules/ValueChange';
import type { SearchQuery } from '../../../Contracts/Search/SearchQuery';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { buildElement, type ElementChild } from '../../Core/Dom/buildElement';
import { UtcText } from '../../Core/Formatting/UtcText';
import { FormControls } from '../../Core/Dom/FormControls';
import { BODY_MODE, type BodyMode } from './BodyMode';
import { JsonTreeView } from './JsonTreeView';
import { sessionInspectorPreferences } from './sessionInspectorPreferences';
import { TextHighlighter } from './TextHighlighter';

const NONE_TEXT = '(none)';
const REMOVED_TEXT = '(removed)';
const MODIFIED_TEXT = 'Modified';
const EMPTY_BODY_TEXT = 'No body.';

export interface DefinitionAction {
    label: string;
    icon: string;
    run: () => void;
}

export interface DefinitionItem {
    term: string;
    value: string;
    change?: ValueChange | undefined;
    action?: DefinitionAction | undefined;
}

export type HeaderActionOf = (header: HeaderEntry) => DefinitionAction | undefined;

function valueChildren(item: DefinitionItem): ElementChild[] {
    if (item.action == null) {
        return [item.value];
    }

    const action = item.action;

    return [
        item.value,
        buildElement('button', {
            className: 'button-icon detail-action',
            text: action.icon,
            attributes: {
                type: 'button',
                title: action.label,
                'aria-label': action.label,
            },
            listeners: {
                click: () => action.run(),
            },
        }),
    ];
}

function changeTitle(change: ValueChange): string {
    if (change.before == null) {
        return 'Added by a rule.';
    }

    return change.after == null
        ? `Removed by a rule. Was: ${change.before}`
        : `Updated by a rule. Was: ${change.before}`;
}

function modifiedTag(title: string): HTMLElement {
    return buildElement('span', {
        className: 'modified-tag',
        text: MODIFIED_TEXT,
        title,
    });
}

function definitionList(items: DefinitionItem[]): HTMLDListElement {
    return buildElement('dl', {
        className: 'definitions',
        children: items.flatMap(item => [
            buildElement('dt', {
                children: [
                    item.term,
                    item.change == null ? null : modifiedTag(changeTitle(item.change)),
                ],
            }),
            buildElement('dd', {
                children: valueChildren(item),
            }),
        ]),
    });
}

interface ChangeOfOptions {
    changes: ValueChange[];
    area: ChangeArea;
    name: string;
}

function changeOf({ changes, area, name }: ChangeOfOptions): ValueChange | undefined {
    return changes.find(change => change.area === area && change.name.toLowerCase() === name.toLowerCase());
}

interface RemovedHeadersOptions {
    changes: ValueChange[];
    area: ChangeArea;
    headers: HeaderEntry[];
}

function removedHeaders({ changes, area, headers }: RemovedHeadersOptions): DefinitionItem[] {
    return changes
        .filter(change => change.area === area && change.after == null)
        .filter(change => !headers.some(header => header.name.toLowerCase() === change.name.toLowerCase()))
        .map(change => ({
            term: change.name,
            value: REMOVED_TEXT,
            change,
        }));
}

function flagsOf(cookie: SetCookie): string {
    return [
        cookie.secure ? 'Secure' : '',
        cookie.httpOnly ? 'HttpOnly' : '',
        cookie.sameSite === '' ? '' : `SameSite=${cookie.sameSite}`,
        cookie.partitioned ? 'Partitioned' : '',
    ]
        .filter(flag => flag !== '')
        .join(' ');
}

// Only a JSON object or array has a tree; any other body is shown as text alone.
function treeOf(body: string | null): object | null {
    if (body == null) {
        return null;
    }

    const parsed = JsonText.tryParse(body);
    if (parsed.hasErrors) {
        return null;
    }

    const value = parsed.value;

    return typeof value === 'object' && value !== null ? value : null;
}

interface BodyContentOptions {
    body: string;
    tree: object | null;
    query: SearchQuery | null;
    shouldWrap: boolean;
}

function bodyContent({ body, tree, query, shouldWrap }: BodyContentOptions): HTMLElement {
    const wantsTree = sessionInspectorPreferences.bodyMode === BODY_MODE.Tree && query == null;
    if (wantsTree && tree != null) {
        return JsonTreeView.build(tree, shouldWrap);
    }

    return buildElement('pre', {
        className: 'code-block',
        attributes: shouldWrap ? { 'data-wrap': '' } : {},
        children: TextHighlighter.build(
            /* text: */ JsonText.format(body),
            /* query: */ query,
        ),
    });
}

export interface HeadersOptions {
    headers: HeaderEntry[];
    changes: ValueChange[];
    area: ChangeArea;
    actionOf?: HeaderActionOf;
}

export interface BodyOptions {
    body: string | null;
    note: string | null;
    query: SearchQuery | null;
    change?: ValueChange | undefined;
}

export const DetailSections = {
    definitions(items: DefinitionItem[]): HTMLDListElement {
        return definitionList(items.filter(item => item.value !== ''));
    },

    headers({ headers, changes, area, actionOf = () => undefined }: HeadersOptions): HTMLElement {
        const items = [
            ...headers.map(header => ({
                term: header.name,
                value: header.value,
                change: changeOf({ changes, area, name: header.name }),
                action: actionOf(header),
            })),
            ...removedHeaders({ changes, area, headers }),
        ];
        if (items.length === 0) {
            return buildElement('p', {
                className: 'empty-note',
                text: 'None.',
            });
        }

        return definitionList(items);
    },

    cookies(pairs: CookiePair[]): HTMLElement | null {
        if (pairs.length === 0) {
            return null;
        }

        return buildElement('div', {
            className: 'cookie-table',
            children: [
                buildElement('h4', {
                    text: `Cookies (${pairs.length})`,
                }),
                DetailSections.definitions(pairs.map(pair => ({
                    term: pair.name,
                    value: pair.value === '' ? NONE_TEXT : pair.value,
                }))),
            ],
        });
    },

    setCookies(cookies: SetCookie[]): HTMLElement | null {
        if (cookies.length === 0) {
            return null;
        }

        return buildElement('div', {
            className: 'cookie-table',
            children: [
                buildElement('h4', {
                    text: `Set-Cookie (${cookies.length})`,
                }),
                ...cookies.map(cookie => buildElement('div', {
                    className: 'set-cookie',
                    children: [
                        DetailSections.definitions([
                            {
                                term: 'Name',
                                value: cookie.name,
                            },
                            {
                                term: 'Value',
                                value: cookie.value === '' ? NONE_TEXT : cookie.value,
                            },
                            {
                                term: 'Domain',
                                value: cookie.domain,
                            },
                            {
                                term: 'Path',
                                value: cookie.path,
                            },
                            {
                                term: 'Expires',
                                value: cookie.maxAge === ''
                                    ? UtcText.ofText(cookie.expires)
                                    : `Max-Age ${cookie.maxAge}`,
                            },
                            {
                                term: 'Flags',
                                value: flagsOf(cookie),
                            },
                        ]),
                    ],
                })),
            ],
        });
    },

    body({ body, note, query, change = undefined }: BodyOptions): HTMLElement {
        const host = buildElement('div', {
            className: 'body-host',
        });
        const tree = treeOf(body);
        const render = (): void => {
            if (body == null || body === '') {
                host.replaceChildren();

                return;
            }

            host.replaceChildren(bodyContent({
                body,
                tree,
                query,
                shouldWrap: sessionInspectorPreferences.shouldWrap,
            }));
        };
        render();

        const isEmpty = body == null || body === '';

        return buildElement('div', {
            className: 'body-view',
            children: [
                note == null
                    ? null
                    : buildElement('p', {
                        className: 'help-text',
                        text: note,
                    }),
                isEmpty && note == null
                    ? buildElement('p', {
                        className: 'empty-note',
                        text: EMPTY_BODY_TEXT,
                    })
                    : null,
                isEmpty
                    ? null
                    : buildElement('div', {
                        className: 'body-tools',
                        children: [
                            change == null ? null : modifiedTag('Changed by a rule.'),
                            tree == null ? null : FormControls.select({
                                value: String(sessionInspectorPreferences.bodyMode),
                                options: [
                                    {
                                        value: String(BODY_MODE.Tree),
                                        label: 'Tree',
                                    },
                                    {
                                        value: String(BODY_MODE.Raw),
                                        label: 'Raw',
                                    },
                                ],
                                onChange: value => {
                                    sessionInspectorPreferences.bodyMode = Number(value) as BodyMode;
                                    render();
                                },
                            }),
                            FormControls.checkbox({
                                checked: sessionInspectorPreferences.shouldWrap,
                                label: 'Wrap',
                                onChange: isChecked => {
                                    sessionInspectorPreferences.shouldWrap = isChecked;
                                    render();
                                },
                            }),
                        ],
                    }),
                host,
            ],
        });
    },

    changeOf,
};
