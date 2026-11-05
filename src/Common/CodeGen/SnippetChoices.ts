import { CookieHeader } from "../Rules/Http/CookieHeader";
import { QueryString } from "../Urls/QueryString";
import type { RequestSnapshot } from "./RequestSnapshot";
import { SnippetHeaderNames, SnippetParts } from "./SnippetParts";

export interface SnippetChoice {
    key: string;
    label: string;
}

function unique(choices: SnippetChoice[]): SnippetChoice[] {
    return choices.filter((choice, index) => choices.findIndex(candidate => candidate.key === choice.key) === index);
}

function sameKeyAndLabel(name: string): SnippetChoice {
    return {
        key: name,
        label: name,
    };
}

export const SnippetChoices = {
    headersOf(snapshot: RequestSnapshot): SnippetChoice[] {
        return unique(SnippetParts
            .sendable(snapshot.headers)
            .filter(header => header.name.toLowerCase() !== SnippetHeaderNames.Cookie)
            .map(header => ({
                key: header.name.toLowerCase(),
                label: header.name,
            })));
    },

    cookiesOf(snapshot: RequestSnapshot): SnippetChoice[] {
        return unique(SnippetParts
            .sendable(snapshot.headers)
            .filter(header => header.name.toLowerCase() === SnippetHeaderNames.Cookie)
            .flatMap(header => CookieHeader.parse(header.value))
            .map(cookie => sameKeyAndLabel(cookie.name)));
    },

    queryParamsOf(snapshot: RequestSnapshot): SnippetChoice[] {
        return QueryString
            .keysOf(snapshot.url)
            .map(sameKeyAndLabel);
    },

    hasBody(snapshot: RequestSnapshot): boolean {
        return snapshot.body !== null && snapshot.body !== "";
    },
};
