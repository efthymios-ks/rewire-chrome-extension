import type { ChangeArea } from '../../../Contracts/Rules/ChangeArea';
import type { SearchScope } from '../../../Contracts/Search/SearchScope';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import { buildElement } from '../../Core/Dom/buildElement';
import type { PanelState } from '../../Core/PanelState';
import type { PanelContext } from '../Shell/PanelContext';
import { BodyCopyButton } from './BodyCopyButton';
import { DetailSections } from './DetailSections';
import { InspectorSearch } from './InspectorSearch';

const BODY_CHANGE_NAME = 'body';

export interface BuildOptions {
    context: PanelContext;
    detail: TimelineEntryDetail;
    state: PanelState;
    body: string | null;
    note: string | null;
    area: ChangeArea;
    searchScope: SearchScope;
    copyText: string;
}

export const TextBodyView = {
    build({ context, detail, state, body, note, area, searchScope, copyText }: BuildOptions): HTMLElement {
        return buildElement('div', {
            className: 'body-tab',
            children: [
                BodyCopyButton.build({
                    context,
                    body,
                    text: copyText,
                }),
                DetailSections.body({
                    body,
                    note,
                    query: InspectorSearch.bodyQueryOf(state, searchScope),
                    change: DetailSections.changeOf({
                        changes: detail.changes,
                        area,
                        name: BODY_CHANGE_NAME,
                    }),
                }),
            ],
        });
    },
};
