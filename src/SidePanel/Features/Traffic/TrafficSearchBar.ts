import type { SearchQuery } from '../../../Contracts/Search/SearchQuery';
import { type SearchScope, SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import { buildElement } from '../../Core/Dom/buildElement';
import { type CheckChoice, CheckDropdown } from '../../Core/Dom/CheckDropdown';
import { FormControls } from '../../Core/Dom/FormControls';
import { Equalities } from '../../Core/Equalities';
import type { PanelContext } from '../Shell/PanelContext';
import { SearchStatusText } from './SearchStatusText';

const SCOPE_CHOICES: readonly CheckChoice<SearchScope>[] = Object.freeze([
    {
        key: SEARCH_SCOPES.Url,
        label: 'URL',
        title: 'Search the URL without its query string',
    },
    {
        key: SEARCH_SCOPES.Query,
        label: 'Query',
        title: 'Search the query string',
    },
    {
        key: SEARCH_SCOPES.RequestHeaders,
        label: 'Request Headers',
        title: 'Search request header names and values',
    },
    {
        key: SEARCH_SCOPES.RequestBody,
        label: 'Request Body',
        title: 'Search the request body',
    },
    {
        key: SEARCH_SCOPES.RequestCookies,
        label: 'Request Cookies',
        title: 'Search the names and values of the cookies the request sends',
    },
    {
        key: SEARCH_SCOPES.ResponseHeaders,
        label: 'Response Headers',
        title: 'Search response header names and values',
    },
    {
        key: SEARCH_SCOPES.ResponseBody,
        label: 'Response Body',
        title: 'Search the response body',
    },
    {
        key: SEARCH_SCOPES.ResponseCookies,
        label: 'Response Cookies',
        title: 'Search the names and values of the cookies the response sets',
    },
]);

interface ToggleChipOptions {
    text: string;
    title: string;
    onClick: () => void;
}

function toggleChip({ text, title, onClick }: ToggleChipOptions): HTMLButtonElement {
    return buildElement('button', {
        className: 'chip',
        text,
        title,
        attributes: {
            type: 'button',
            'aria-label': title,
        },
        listeners: {
            click: onClick,
        },
    });
}

export class TrafficSearchBar {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        const search = context.trafficSearch;
        const current = (): SearchQuery => context.store.getState().search.query;
        const update = (patch: Partial<SearchQuery>): void => search.setQuery({
            ...current(),
            ...patch,
        });

        const searchBox = FormControls.searchInput({
            value: current().text,
            placeholder: 'Search',
            ariaLabel: 'Search traffic',
            className: 'traffic-search',
            onInput: text => update({
                text,
            }),
        });

        const regexChip = toggleChip({
            text: '.*',
            title: 'Regular expression',
            onClick: () => update({
                isRegex: !current().isRegex,
            }),
        });
        const scopeDropdown = new CheckDropdown({
            label: 'Search in',
            choices: SCOPE_CHOICES,
            selected: current().scopes,
            onChange: scopes => update({
                scopes,
            }),
        });
        const status = buildElement('span', {
            className: 'search-status',
            attributes: {
                'aria-live': 'polite',
            },
        });

        this.root = buildElement('div', {
            className: 'traffic-search-bar',
            children: [
                searchBox,
                status,
                regexChip,
                scopeDropdown.root,
            ],
        });

        context.store.select({
            selector: state => [
                state.search,
                state.entries,
                state.contentFilter,
                state.frameFilter,
            ],
            listener: () => {
                const state = context.store.getState();
                const query = state.search.query;
                regexChip.setAttribute(
                    /* qualifiedName: */ 'aria-pressed',
                    /* value: */ String(query.isRegex),
                );
                scopeDropdown.setSelected(query.scopes);
                status.toggleAttribute('data-error', state.search.error != null);
                status.textContent = SearchStatusText.of(state);
            },
            isEqual: Equalities.shallowArray,
        });
    }
}
