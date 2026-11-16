import { Result } from '../Results/Result';

const RE2_NAMED_GROUP_PATTERN = /\(\?P</g;
const JAVASCRIPT_NAMED_GROUP = '(?<';
const MAX_CACHED_PATTERNS = 200;
const IGNORE_CASE_FLAG = 'i';

const cache = new Map<string, Result<RegExp>>();

function compileUncached(source: string, flags: string): Result<RegExp> {
    return Result.attempt(() => new RegExp(
        /* pattern: */ source.replace(RE2_NAMED_GROUP_PATTERN, JAVASCRIPT_NAMED_GROUP),
        /* flags: */ flags,
    ));
}

export const RegexCache = {
    compile(source: string, flags: string = ''): Result<RegExp> {
        const key = `${flags}/${source}`;
        const cached = cache.get(key);
        if (cached != null) {
            return cached;
        }

        const compiled = compileUncached(source, flags);
        if (cache.size >= MAX_CACHED_PATTERNS) {
            cache.clear();
        }

        cache.set(key, compiled);

        return compiled;
    },

    test(source: string, text: string): boolean {
        const compiled = RegexCache.compile(source);

        return !compiled.hasErrors && compiled.value.test(text);
    },

    testIgnoringCase(source: string, text: string): boolean {
        const compiled = RegexCache.compile(source, IGNORE_CASE_FLAG);

        return !compiled.hasErrors && compiled.value.test(text);
    },
};
