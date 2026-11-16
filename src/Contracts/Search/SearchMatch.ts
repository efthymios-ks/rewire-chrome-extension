import type { SearchField } from './SearchField';

export interface SearchMatch {
    entryId: string;
    fields: SearchField[];
    count: number;
}
