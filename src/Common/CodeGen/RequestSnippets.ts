import { CurlBashSnippet } from './CurlBashSnippet';
import { CurlCmdSnippet } from './CurlCmdSnippet';
import { FetchNodeSnippet } from './FetchNodeSnippet';
import { FetchSnippet } from './FetchSnippet';
import type { RequestSnippet } from './RequestSnippet';
import { PowerShellSnippet } from './PowerShellSnippet';
import type { RequestSnippetType } from './RequestSnippetType';
import { WgetSnippet } from './WgetSnippet';

const DISPLAY_ORDER: RequestSnippetType[] = [
    CurlBashSnippet,
    CurlCmdSnippet,
    WgetSnippet,
    FetchSnippet,
    FetchNodeSnippet,
    PowerShellSnippet,
];

const PARSE_ORDER: RequestSnippetType[] = [
    CurlCmdSnippet,
    CurlBashSnippet,
    WgetSnippet,
    PowerShellSnippet,
    FetchSnippet,
    FetchNodeSnippet,
];

export const RequestSnippets = {
    all(): RequestSnippetType[] {
        return DISPLAY_ORDER;
    },

    get(id: string): RequestSnippetType {
        return DISPLAY_ORDER.find(type => type.id === id) ?? DISPLAY_ORDER[0]!;
    },

    parse(text: string): RequestSnippet | null {
        for (const type of PARSE_ORDER) {
            const snippet = type.tryParse(text);
            if (snippet != null) {
                return snippet;
            }
        }

        return null;
    },
};
