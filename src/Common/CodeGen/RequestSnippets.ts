import { CurlBashSnippet } from "./CurlBashSnippet";
import { CurlCmdSnippet } from "./CurlCmdSnippet";
import { FetchNodeSnippet } from "./FetchNodeSnippet";
import { FetchSnippet } from "./FetchSnippet";
import type { IRequestSnippet, RequestSnippetType } from "./IRequestSnippet";
import { PowerShellSnippet } from "./PowerShellSnippet";
import { WgetSnippet } from "./WgetSnippet";

const DisplayOrder: RequestSnippetType[] = [
    CurlBashSnippet,
    CurlCmdSnippet,
    WgetSnippet,
    FetchSnippet,
    FetchNodeSnippet,
    PowerShellSnippet,
];

const ParseOrder: RequestSnippetType[] = [
    CurlCmdSnippet,
    CurlBashSnippet,
    WgetSnippet,
    PowerShellSnippet,
    FetchSnippet,
    FetchNodeSnippet,
];

export const RequestSnippets = {
    all(): RequestSnippetType[] {
        return DisplayOrder;
    },

    get(id: string): RequestSnippetType {
        return DisplayOrder.find(type => type.id === id) ?? DisplayOrder[0]!;
    },

    parse(text: string): IRequestSnippet | null {
        for (const type of ParseOrder) {
            const snippet = type.tryParse(text);
            if (snippet !== null) {
                return snippet;
            }
        }

        return null;
    },
};
