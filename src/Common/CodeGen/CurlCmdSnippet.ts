import { CurlCommand } from "./CurlCommand";
import type { ISnippetGenerator, RequestSnapshot, SnippetOptions } from "./RequestSnapshot";
import { SnippetParts } from "./SnippetParts";

const LineContinuation = " ^\n  ";
const Utf8CodePage = "chcp 65001 >nul";

export class CurlCmdSnippet implements ISnippetGenerator {
    readonly id = "curl-cmd";
    readonly label = "cURL (cmd)";

    generate(snapshot: RequestSnapshot, options: SnippetOptions): string {
        return CurlCommand.build(
            snapshot,
            options,
            {
                lineContinuation: LineContinuation,
                quote: SnippetParts.cmdQuote,
                body: body => ({
                    pipe: null,
                    argument: `--data-raw ${SnippetParts.cmdQuote(body)}`,
                }),
                preamble: command => SnippetParts.hasNonAscii(command) ? Utf8CodePage : null,
            }
        );
    }
}
