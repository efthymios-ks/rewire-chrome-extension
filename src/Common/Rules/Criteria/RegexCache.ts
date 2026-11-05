import { ErrorText } from "../../Errors/ErrorText";
import { Result } from "../../Results/Result";

const Re2NamedGroupPattern = /\(\?P</g;
const JavaScriptNamedGroup = "(?<";
const MaxCachedPatterns = 200;

const cache = new Map<string, Result<RegExp>>();

export const RegexCache = {
    compile(source: string): Result<RegExp> {
        const cached = cache.get(source);
        if (cached !== undefined) {
            return cached;
        }

        let compiled: Result<RegExp>;
        try {
            compiled = Result.ok(new RegExp(source.replace(Re2NamedGroupPattern, JavaScriptNamedGroup)));
        } catch (error) {
            compiled = Result.fail(ErrorText.of(error));
        }

        if (cache.size >= MaxCachedPatterns) {
            cache.clear();
        }

        cache.set(source, compiled);

        return compiled;
    },

    test(source: string, text: string): boolean {
        const compiled = RegexCache.compile(source);

        return !compiled.hasErrors && compiled.value.test(text);
    },
};
