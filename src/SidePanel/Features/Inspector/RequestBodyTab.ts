import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { SEARCH_FIELDS } from '../../../Contracts/Search/SearchField';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import { buildElement } from '../../Core/Dom/buildElement';
import { INSPECTOR_TAB_ID } from '../../Core/InspectorTabId';
import type { PanelState } from '../../Core/PanelState';
import type { PanelContext } from '../Shell/PanelContext';
import { BinaryBodyView } from './BinaryBodyView';
import { BodyCopyButton } from './BodyCopyButton';
import type { InspectorTab } from './InspectorTab';
import { InspectorSearch } from './InspectorSearch';
import { TextBodyView } from './TextBodyView';

export class RequestBodyTab implements InspectorTab {
    readonly id = INSPECTOR_TAB_ID.RequestBody;
    readonly label = 'Request Body';
    readonly searchFields = [SEARCH_FIELDS.RequestBody];

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    keyOf(state: PanelState): string {
        return `${state.detailVersion}|${InspectorSearch.bodyKeyOf(state, SEARCH_SCOPES.RequestBody)}`;
    }

    render(detail: TimelineEntryDetail, state: PanelState): HTMLElement {
        const note = detail.requestBodyNote;
        const base64 = detail.requestBodyBase64;
        if (base64 != null) {
            return buildElement('div', {
                className: 'body-tab',
                children: [
                    BodyCopyButton.build({
                        context: this._context,
                        body: base64,
                        text: 'Copy as base64',
                    }),
                    BinaryBodyView.build({ base64, note }),
                ],
            });
        }

        return TextBodyView.build({
            context: this._context,
            detail,
            state,
            body: detail.requestBody,
            note,
            area: CHANGE_AREA.RequestBody,
            searchScope: SEARCH_SCOPES.RequestBody,
            copyText: 'Copy request body',
        });
    }
}
