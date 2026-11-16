import { HeaderLookup } from '../../../Common/Http/HeaderLookup';
import { JwtToken } from '../../../Common/Jwt/JwtToken';
import { CookieHeader } from '../../../Common/Rules/Http/CookieHeader';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { SEARCH_FIELDS } from '../../../Contracts/Search/SearchField';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import { buildElement } from '../../Core/Dom/buildElement';
import { INSPECTOR_TAB_ID } from '../../Core/InspectorTabId';
import type { PanelState } from '../../Core/PanelState';
import type { PanelContext } from '../Shell/PanelContext';
import { type DefinitionAction, DetailSections } from './DetailSections';
import type { InspectorTab } from './InspectorTab';

const OPEN_ICON = '↗';

export class RequestHeadersTab implements InspectorTab {
    readonly id = INSPECTOR_TAB_ID.RequestHeaders;
    readonly label = 'Request Headers';
    readonly searchFields = [
        SEARCH_FIELDS.RequestHeaders,
        SEARCH_FIELDS.RequestCookies,
    ];

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    keyOf(state: PanelState): string {
        return String(state.detailVersion);
    }

    render(detail: TimelineEntryDetail): HTMLElement {
        return buildElement('div', {
            className: 'headers-tab',
            children: [
                DetailSections.headers({
                    headers: detail.requestHeaders,
                    changes: detail.changes,
                    area: CHANGE_AREA.RequestHeader,
                    actionOf: header => this.jwtActionOf(header),
                }),
                DetailSections.cookies(
                    CookieHeader.parse(HeaderLookup.find(detail.requestHeaders, HEADER_NAMES.Cookie)),
                ),
            ],
        });
    }

    private jwtActionOf(header: HeaderEntry): DefinitionAction | undefined {
        const isAuthorization = header.name.toLowerCase() === HEADER_NAMES.Authorization.toLowerCase();
        if (!isAuthorization || !JwtToken.looksLike(header.value)) {
            return undefined;
        }

        return {
            label: 'Open in the JWT tab',
            icon: OPEN_ICON,
            run: () => this._context.viewLauncher.openJwt(header.value),
        };
    }
}
