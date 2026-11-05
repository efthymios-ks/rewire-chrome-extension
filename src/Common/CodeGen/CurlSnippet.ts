import { type CurlBody, CurlCommand } from "./CurlCommand";
import type { ISnippetGenerator, RequestSnapshot, SnippetOptions } from "./RequestSnapshot";
import { SnippetParts } from "./SnippetParts";

const LineContinuation = " \\\n  ";
const StandardInput = "@-";

function bodyOf(body: string): CurlBody {
    if (!SnippetParts.hasNonAscii(body)) {
        return {
            pipe: null,
            argument: `--data-raw ${SnippetParts.posixQuote(body)}`,
        };
    }

    return {
        pipe: `printf '%s' ${SnippetParts.posixQuote(body)} | `,
        argument: `--data-binary ${StandardInput}`,
    };
}

export class CurlSnippet implements ISnippetGenerator {
    readonly id = "curl";
    readonly label = "cURL (bash)";

    generate(snapshot: RequestSnapshot, options: SnippetOptions): string {
        return CurlCommand.build(
            snapshot,
            options,
            {
                lineContinuation: LineContinuation,
                quote: SnippetParts.posixQuote,
                body: bodyOf,
                preamble: () => null,
            }
        );
    }
}
