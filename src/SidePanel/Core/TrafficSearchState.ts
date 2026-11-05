import type { SearchMatch, SearchQuery } from "../../Contracts/Search/SearchQuery";

export interface TrafficSearchState {
    query: SearchQuery;
    matches: SearchMatch[];
    activeIndex: number;
    error: string | null;
}
