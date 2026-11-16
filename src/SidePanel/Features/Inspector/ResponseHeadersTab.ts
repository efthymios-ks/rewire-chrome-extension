import { HeaderList } from '../../../Common/Rules/Http/HeaderList';
import { SetCookieHeader } from '../../../Common/Rules/Http/SetCookieHeader';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { SEARCH_FIELDS } from '../../../Contracts/Search/SearchField';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import { buildElement } from '../../Core/Dom/buildElement';
import { INSPECTOR_TAB_ID } from '../../Core/InspectorTabId';
import type { PanelState } from '../../Core/PanelState';
import { DetailSections } from './DetailSections';
import type { InspectorTab } from './InspectorTab';

export class ResponseHeadersTab implements InspectorTab {
    readonly id = INSPECTOR_TAB_ID.ResponseHeaders;
    readonly label = 'Response Headers';
    readonly searchFields = [
        SEARCH_FIELDS.ResponseHeaders,
        SEARCH_FIELDS.ResponseCookies,
    ];

    keyOf(state: PanelState): string {
        return String(state.detailVersion);
    }

    render(detail: TimelineEntryDetail): HTMLElement {
        return buildElement('div', {
            className: 'headers-tab',
            children: [
                DetailSections.headers({
                    headers: detail.responseHeaders,
                    changes: detail.changes,
                    area: CHANGE_AREA.ResponseHeader,
                }),
                DetailSections.setCookies(HeaderList
                    .values(detail.responseHeaders, HEADER_NAMES.SetCookie)
                    .map(value => SetCookieHeader.parse(value))),
            ],
        });
    }
}
