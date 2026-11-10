import { CurlCommand, type CurlTextBody } from "./CurlCommand";
import { CurlOptionParser } from "./Parsing/CurlOptionParser";
import { PosixShellWords } from "./Parsing/PosixShellWords";
import { RequestLines } from "./Parsing/RequestLines";
import { DefaultSnippetParts, type RequestSnapshot, type SnippetOptions } from "./RequestSnapshot";
import { RequestSnippetBase } from "./RequestSnippetBase";
import { ShellQuoting } from "./ShellQuoting";
import { SnippetRequests } from "./SnippetRequest";

const LineContinuation = " \\\n  ";
const StandardInput = "@-";
const CommandName = "curl";
const PrintfCommand = "printf";
const PrintfTextFormat = "%s";
const Pipe = "|";

function textBodyOf(text: string): CurlTextBody {
    if (!ShellQuoting.hasNonAscii(text)) {
        return {
            pipe: null,
            argument: `--data-raw ${ShellQuoting.posix(text)}`,
        };
    }

    return {
        pipe: `printf '%s' ${ShellQuoting.posix(text)} | `,
        argument: `--data-binary ${StandardInput}`,
    };
}

function standardInputOf(words: string[]): string | null {
    const printf = words.lastIndexOf(PrintfCommand);
    const isTextPipe = printf !== -1
        && words[printf + 1] === PrintfTextFormat
        && words[printf + 3] === Pipe;

    return isTextPipe ? words[printf + 2] ?? null : null;
}

export class CurlBashSnippet extends RequestSnippetBase {
    static readonly id = "curl";
    static readonly label = "cURL (bash)";

    static tryParse(text: string): CurlBashSnippet | null {
        const words = PosixShellWords.split(text);
        if (words === null) {
            return null;
        }

        const commandIndex = RequestLines.commandIndex(words, CommandName);
        if (commandIndex === -1) {
            return null;
        }

        const request = CurlOptionParser.parse(
            RequestLines.argumentsAfter(words, commandIndex),
            standardInputOf(words.slice(0, commandIndex))
        );

        return request === null ? null : new CurlBashSnippet(request);
    }

    static from(snapshot: RequestSnapshot, options: SnippetOptions = DefaultSnippetParts): CurlBashSnippet {
        return new CurlBashSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        return CurlCommand.render(this.request, {
            lineContinuation: LineContinuation,
            quote: ShellQuoting.posix,
            textBody: textBodyOf,
            preamble: () => null,
        });
    }
}
