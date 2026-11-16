import type { SearchScope } from './SearchScope';

export interface SearchQuery {
    text: string;
    isRegex: boolean;
    scopes: SearchScope[];
}
