import { CurlCommand } from "./CurlCommand";
import { CmdShellWords } from "./Parsing/CmdShellWords";
import { CurlOptionParser } from "./Parsing/CurlOptionParser";
import { RequestLines } from "./Parsing/RequestLines";
import { DefaultSnippetParts, type RequestSnapshot, type SnippetOptions } from "./RequestSnapshot";
import { RequestSnippetBase } from "./RequestSnippetBase";
import { ShellQuoting } from "./ShellQuoting";
import { SnippetRequests } from "./SnippetRequest";

const LineContinuation = " ^\n  ";
const Utf8CodePage = "chcp 65001 >nul";
const CommandName = "curl";
const CmdMarkerPattern = /\^"|\^\r?\n|^\s*chcp\b/im;

export class CurlCmdSnippet extends RequestSnippetBase {
    static readonly id = "curl-cmd";
    static readonly label = "cURL (cmd)";

    static tryParse(text: string): CurlCmdSnippet | null {
        if (!CmdMarkerPattern.test(text)) {
            return null;
        }

        const words = CmdShellWords.split(text);
        const commandIndex = RequestLines.commandIndex(words, CommandName);
        if (commandIndex === -1) {
            return null;
        }

        const request = CurlOptionParser.parse(RequestLines.argumentsAfter(words, commandIndex), null);

        return request === null ? null : new CurlCmdSnippet(request);
    }

    static from(snapshot: RequestSnapshot, options: SnippetOptions = DefaultSnippetParts): CurlCmdSnippet {
        return new CurlCmdSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        return CurlCommand.render(this.request, {
            lineContinuation: LineContinuation,
            quote: ShellQuoting.cmd,
            textBody: text => ({
                pipe: null,
                argument: `--data-raw ${ShellQuoting.cmd(text)}`,
            }),
            preamble: command => ShellQuoting.hasNonAscii(command) ? Utf8CodePage : null,
        });
    }
}
