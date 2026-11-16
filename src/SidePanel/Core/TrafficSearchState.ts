import type { SearchMatch } from '../../Contracts/Search/SearchMatch';
import type { SearchQuery } from '../../Contracts/Search/SearchQuery';

export interface TrafficSearchState {
    query: SearchQuery;
    searchedText: string;
    matches: SearchMatch[];
    error: string | null;
}
