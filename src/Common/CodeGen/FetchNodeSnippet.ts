import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import { DEFAULT_SNIPPET_PARTS } from './DefaultSnippetParts';
import { FetchCall } from './FetchCall';
import type { RequestSnapshot } from './RequestSnapshot';
import { RequestSnippetBase } from './RequestSnippetBase';
import type { SnippetOptions } from './SnippetOptions';
import { SnippetRequests } from './SnippetRequests';

const FILE_IMPORT = 'import { readFile } from "node:fs/promises";';

export class FetchNodeSnippet extends RequestSnippetBase {
    static readonly id = 'fetch-node';
    static readonly label = 'Fetch (Node.js)';

    static tryParse(_text: string): FetchNodeSnippet | null {
        return null;
    }

    static from(
        snapshot: RequestSnapshot,
        options: SnippetOptions = DEFAULT_SNIPPET_PARTS,
    ): FetchNodeSnippet {
        return new FetchNodeSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        return FetchCall.render(this.request, {
            headersOf: request => {
                const cookie = SnippetRequests.cookieTextOf(request);

                return [
                    ...FetchCall.withoutAcceptEncoding(request.headers),
                    ...(cookie == null
                        ? []
                        : [
                            {
                                name: HEADER_NAMES.Cookie,
                                value: cookie,
                            },
                        ]),
                ];
            },
            extraOptions: () => [],
            fileExpression: fileName => `new Blob([await readFile(${JSON.stringify(fileName)})])`,
            preamble: request => FetchCall.usesFiles(request.body)
                ? [
                    FILE_IMPORT,
                    '',
                ]
                : [],
        });
    }
}
