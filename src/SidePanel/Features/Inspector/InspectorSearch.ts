import type { SearchQuery } from "../../../Contracts/Search/SearchQuery";
import type { PanelState } from "../../Core/PanelState";

export const InspectorSearch = {
    queryOf(state: PanelState): SearchQuery | null {
        const search = state.search;

        return search.query.text === "" || search.error !== null ? null : search.query;
    },

    keyOf(state: PanelState): string {
        return JSON.stringify(InspectorSearch.queryOf(state));
    },
};
