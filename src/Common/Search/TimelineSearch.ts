import { SearchFields, type SearchField, type SearchMatch, type SearchQuery } from "../../Contracts/Search/SearchQuery";
import type { HeaderEntry } from "../../Contracts/Timeline/HeaderEntry";
import { Result } from "../Results/Result";
import { SearchPattern } from "./SearchPattern";

export interface SearchableEntry {
    id: string;
    url: string;
    requestBody: string | null;
    responseBody: string | null;
    requestHeaders: HeaderEntry[];
    responseHeaders: HeaderEntry[];
}

type FieldReader = (entry: SearchableEntry) => string | null;

function headerText(headers: HeaderEntry[]): string {
    return headers
        .map(header => `${header.name}: ${header.value}`)
        .join("\n");
}

const SearchableFields: SearchField[] = Object.values(SearchFields);

const FieldReaders: Record<SearchField, FieldReader> = {
    [SearchFields.Url]: entry => entry.url,
    [SearchFields.RequestBody]: entry => entry.requestBody,
    [SearchFields.ResponseBody]: entry => entry.responseBody,
    [SearchFields.RequestHeaders]: entry => headerText(entry.requestHeaders),
    [SearchFields.ResponseHeaders]: entry => headerText(entry.responseHeaders),
};

export const TimelineSearch = {
    search(entries: SearchableEntry[], query: SearchQuery): Result<SearchMatch[]> {
        const pattern = SearchPattern.create(query);
        if (pattern.hasErrors) {
            return pattern;
        }

        const regex = pattern.value;
        if (regex === null) {
            return Result.ok([]);
        }

        const matches = entries.flatMap(entry => {
            const counts = SearchableFields.map(field => ({
                field,
                count: SearchPattern.countIn(regex, FieldReaders[field](entry)),
            }));
            const matched = counts.filter(item => item.count > 0);
            if (matched.length === 0) {
                return [];
            }

            return [
                {
                    entryId: entry.id,
                    fields: matched.map(item => item.field),
                    count: matched.reduce((total, item) => total + item.count, 0),
                },
            ];
        });

        return Result.ok(matches);
    },
};
