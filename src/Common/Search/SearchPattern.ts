import type { SearchQuery } from '../../Contracts/Search/SearchQuery';
import { Result } from '../Results/Result';
import { RegexText } from '../Urls/RegexText';

const FLAGS = 'gi';

export const SearchPattern = {
    create(query: Pick<SearchQuery, 'text' | 'isRegex'>): Result<RegExp | null> {
        if (query.text.length === 0) {
            return Result.ok(null);
        }

        const source = query.isRegex ? query.text : RegexText.escape(query.text);

        return Result.attempt(() => new RegExp(source, FLAGS), 'Invalid pattern');
    },

    countIn(pattern: RegExp, text: string | null): number {
        if (text == null || text.length === 0) {
            return 0;
        }

        pattern.lastIndex = 0;
        let count = 0;
        for (const match of text.matchAll(pattern)) {
            if (match[0].length === 0) {
                continue;
            }

            count++;
        }

        return count;
    },
};
