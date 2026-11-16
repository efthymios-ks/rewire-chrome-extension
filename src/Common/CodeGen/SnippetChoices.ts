import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import { CookieHeader } from '../Rules/Http/CookieHeader';
import { QueryString } from '../Urls/QueryString';
import type { RequestSnapshot } from './RequestSnapshot';
import { SnippetHeaders } from './SnippetHeaders';

export interface SnippetChoice {
    key: string;
    label: string;
}

function unique(choices: SnippetChoice[]): SnippetChoice[] {
    return choices.filter((choice, index) => {
        const firstIndex = choices.findIndex(candidate => candidate.key === choice.key);

        return firstIndex === index;
    });
}

function sameKeyAndLabel(name: string): SnippetChoice {
    return {
        key: name,
        label: name,
    };
}

export const SnippetChoices = {
    headersOf(snapshot: RequestSnapshot): SnippetChoice[] {
        return unique(SnippetHeaders
            .forSnippet(snapshot.headers)
            .filter(header => !SnippetHeaders.isNamed(header, HEADER_NAMES.Cookie))
            .map(header => ({
                key: header.name.toLowerCase(),
                label: header.name,
            })));
    },

    cookiesOf(snapshot: RequestSnapshot): SnippetChoice[] {
        return unique(SnippetHeaders
            .forSnippet(snapshot.headers)
            .filter(header => header.name.toLowerCase() === HEADER_NAMES.Cookie.toLowerCase())
            .flatMap(header => CookieHeader.parse(header.value))
            .map(cookie => sameKeyAndLabel(cookie.name)));
    },

    queryParamsOf(snapshot: RequestSnapshot): SnippetChoice[] {
        return QueryString
            .keysOf(snapshot.url)
            .map(sameKeyAndLabel);
    },

    hasBody(snapshot: RequestSnapshot): boolean {
        return snapshot.body != null && snapshot.body !== '';
    },
};
