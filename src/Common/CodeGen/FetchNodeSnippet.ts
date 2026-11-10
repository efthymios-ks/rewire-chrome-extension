import { FetchCall } from "./FetchCall";
import { DefaultSnippetParts, type RequestSnapshot, type SnippetOptions } from "./RequestSnapshot";
import { RequestSnippetBase } from "./RequestSnippetBase";
import { SnippetRequests } from "./SnippetRequest";

const CookieHeaderName = "Cookie";
const FileImport = "import { readFile } from \"node:fs/promises\";";

export class FetchNodeSnippet extends RequestSnippetBase {
    static readonly id = "fetch-node";
    static readonly label = "Fetch (Node.js)";

    static tryParse(_text: string): FetchNodeSnippet | null {
        return null;
    }

    static from(snapshot: RequestSnapshot, options: SnippetOptions = DefaultSnippetParts): FetchNodeSnippet {
        return new FetchNodeSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        return FetchCall.render(this.request, {
            headersOf: request => {
                const cookie = SnippetRequests.cookieTextOf(request);

                return [
                    ...FetchCall.withoutAcceptEncoding(request.headers),
                    ...(cookie === null
                        ? []
                        : [
                            {
                                name: CookieHeaderName,
                                value: cookie,
                            },
                        ]),
                ];
            },
            extraOptions: () => [],
            fileExpression: fileName => `new Blob([await readFile(${JSON.stringify(fileName)})])`,
            preamble: request => FetchCall.usesFiles(request.body)
                ? [
                    FileImport,
                    "",
                ]
                : [],
        });
    }
}
