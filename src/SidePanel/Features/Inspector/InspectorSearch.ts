import type { SearchQuery } from '../../../Contracts/Search/SearchQuery';
import type { SearchScope } from '../../../Contracts/Search/SearchScope';
import type { PanelState } from '../../Core/PanelState';

export const InspectorSearch = {
    // A body is highlighted only while the search looks through that side's body.
    bodyQueryOf(state: PanelState, bodyScope: SearchScope): SearchQuery | null {
        const { query, error } = state.search;
        const isSearchingTheBody = query.text !== ''
            && error == null
            && query.scopes.includes(bodyScope);

        return isSearchingTheBody ? query : null;
    },

    bodyKeyOf(state: PanelState, bodyScope: SearchScope): string {
        return JSON.stringify(InspectorSearch.bodyQueryOf(state, bodyScope));
    },
};
