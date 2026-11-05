import { FetchCall } from "./FetchCall";
import type { ISnippetGenerator, RequestSnapshot, SnippetOptions } from "./RequestSnapshot";

const CookieHeaderName = "Cookie";

export class FetchNodeSnippet implements ISnippetGenerator {
    readonly id = "fetch-node";
    readonly label = "Fetch (Node.js)";

    generate(snapshot: RequestSnapshot, options: SnippetOptions): string {
        return FetchCall.build(
            snapshot,
            options,
            {
                headersOf: parts => [
                    ...FetchCall.withoutAcceptEncoding(parts.headers),
                    ...(parts.cookie === null
                        ? []
                        : [
                            {
                                name: CookieHeaderName,
                                value: parts.cookie,
                            },
                        ]),
                ],
                extraOptions: () => [],
            }
        );
    }
}
