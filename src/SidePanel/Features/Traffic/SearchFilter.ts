import type { TrafficSearchState } from '../../Core/TrafficSearchState';

export const SearchFilter = {
    // Waits for the first answer, so typing into an empty box never blanks the list.
    isActive(search: TrafficSearchState): boolean {
        return search.query.text !== ''
            && search.searchedText !== ''
            && search.error == null;
    },

    matchedIdsOf(search: TrafficSearchState): ReadonlySet<string> | null {
        if (!SearchFilter.isActive(search)) {
            return null;
        }

        return new Set(search.matches.map(match => match.entryId));
    },
};
