import { SearchPattern } from "../../../Common/Search/SearchPattern";
import type { SearchQuery } from "../../../Contracts/Search/SearchQuery";
import { buildElement } from "../../Core/Dom/ElementBuilder";

export const TextHighlighter = {
    build(text: string, query: SearchQuery | null): Array<Node | string> {
        if (query === null) {
            return [text];
        }

        const pattern = SearchPattern.create(query);
        if (pattern.hasErrors || pattern.value === null) {
            return [text];
        }

        const parts: Array<Node | string> = [];
        let cursor = 0;
        for (const match of text.matchAll(pattern.value)) {
            if (match[0].length === 0) {
                break;
            }

            parts.push(text.slice(cursor, match.index));
            parts.push(buildElement("mark", {
                text: match[0],
            }));
            cursor = match.index + match[0].length;
        }

        parts.push(text.slice(cursor));

        return parts;
    },
};
