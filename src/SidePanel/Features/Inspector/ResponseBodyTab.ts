import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { SEARCH_FIELDS } from '../../../Contracts/Search/SearchField';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import { INSPECTOR_TAB_ID } from '../../Core/InspectorTabId';
import type { PanelState } from '../../Core/PanelState';
import type { PanelContext } from '../Shell/PanelContext';
import type { InspectorTab } from './InspectorTab';
import { InspectorSearch } from './InspectorSearch';
import { TextBodyView } from './TextBodyView';

export class ResponseBodyTab implements InspectorTab {
    readonly id = INSPECTOR_TAB_ID.ResponseBody;
    readonly label = 'Response Body';
    readonly searchFields = [SEARCH_FIELDS.ResponseBody];

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    keyOf(state: PanelState): string {
        return `${state.detailVersion}|${InspectorSearch.bodyKeyOf(state, SEARCH_SCOPES.ResponseBody)}`;
    }

    render(detail: TimelineEntryDetail, state: PanelState): HTMLElement {
        return TextBodyView.build({
            context: this._context,
            detail,
            state,
            body: detail.responseBody,
            note: detail.responseBodyNote,
            area: CHANGE_AREA.ResponseBody,
            searchScope: SEARCH_SCOPES.ResponseBody,
            copyText: 'Copy response body',
        });
    }
}
