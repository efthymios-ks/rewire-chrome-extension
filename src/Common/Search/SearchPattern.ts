import type { SearchQuery } from "../../Contracts/Search/SearchQuery";
import { ErrorText } from "../Errors/ErrorText";
import { Result } from "../Results/Result";
import { RegexText } from "../Urls/RegexText";

const Flags = "gi";

export const SearchPattern = {
    create(query: Pick<SearchQuery, "text" | "isRegex">): Result<RegExp | null> {
        if (query.text.length === 0) {
            return Result.ok(null);
        }

        const source = query.isRegex ? query.text : RegexText.escape(query.text);
        try {
            return Result.ok(new RegExp(source, Flags));
        } catch (error) {
            return Result.fail(`Invalid pattern: ${ErrorText.of(error)}`);
        }
    },

    countIn(pattern: RegExp, text: string | null): number {
        if (text === null || text.length === 0) {
            return 0;
        }

        pattern.lastIndex = 0;
        let count = 0;
        for (const match of text.matchAll(pattern)) {
            if (match[0].length === 0) {
                break;
            }

            count++;
        }

        return count;
    },
};
