import type { ISnippetGenerator, RequestSnapshot, SnippetOptions } from "./RequestSnapshot";
import { SnippetHeaderNames, SnippetParts } from "./SnippetParts";

const LineContinuation = " \\\n  ";
const GetMethod = "GET";

export class WgetSnippet implements ISnippetGenerator {
    readonly id = "wget";
    readonly label = "Wget";

    generate(snapshot: RequestSnapshot, options: SnippetOptions): string {
        const parts = SnippetParts.of(snapshot, options);
        const quote = SnippetParts.posixQuote;
        const needsMethod = parts.method !== GetMethod || parts.body !== null;
        const headers = SnippetParts.without(parts.headers, [SnippetHeaderNames.AcceptEncoding]);
        const segments = [
            "wget",
            needsMethod ? `--method=${parts.method}` : null,
            ...headers.map(header => `--header=${quote(`${header.name}: ${header.value}`)}`),
            parts.cookie === null ? null : `--header=${quote(`Cookie: ${parts.cookie}`)}`,
            parts.body === null ? null : `--body-data=${quote(parts.body)}`,
            "--content-on-error",
            "-O -",
            quote(parts.url),
        ];

        return segments
            .filter((segment): segment is string => segment !== null)
            .join(LineContinuation);
    }
}
