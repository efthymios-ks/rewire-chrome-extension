import { CurlCommand, type CurlTextBody } from './CurlCommand';
import { DEFAULT_SNIPPET_PARTS } from './DefaultSnippetParts';
import { CurlOptionParser } from './Parsing/CurlOptionParser';
import { PosixShellWords } from './Parsing/PosixShellWords';
import { RequestLines } from './Parsing/RequestLines';
import type { RequestSnapshot } from './RequestSnapshot';
import { RequestSnippetBase } from './RequestSnippetBase';
import { ShellQuoting } from './ShellQuoting';
import type { SnippetOptions } from './SnippetOptions';
import { SnippetRequests } from './SnippetRequests';

const LINE_CONTINUATION = ' \\\n  ';
const STANDARD_INPUT = '@-';
const COMMAND_NAME = 'curl';
const PRINTF_COMMAND = 'printf';
const PRINTF_TEXT_FORMAT = '%s';
const PIPE = '|';

function textBodyOf(text: string): CurlTextBody {
    if (!ShellQuoting.hasNonAscii(text)) {
        return {
            pipe: null,
            argument: `--data-raw ${ShellQuoting.posix(text)}`,
        };
    }

    return {
        pipe: `printf '%s' ${ShellQuoting.posix(text)} | `,
        argument: `--data-binary ${STANDARD_INPUT}`,
    };
}

function standardInputOf(words: string[]): string | null {
    const printf = words.lastIndexOf(PRINTF_COMMAND);
    const isTextPipe = printf !== -1
        && words[printf + 1] === PRINTF_TEXT_FORMAT
        && words[printf + 3] === PIPE;

    return isTextPipe ? words[printf + 2] ?? null : null;
}

export class CurlBashSnippet extends RequestSnippetBase {
    static readonly id = 'curl';
    static readonly label = 'cURL (bash)';

    static tryParse(text: string): CurlBashSnippet | null {
        const words = PosixShellWords.split(text);
        if (words == null) {
            return null;
        }

        const commandIndex = RequestLines.commandIndex(words, COMMAND_NAME);
        if (commandIndex === -1) {
            return null;
        }

        const request = CurlOptionParser.parse(
            /* args: */ RequestLines.argumentsAfter(words, commandIndex),
            /* standardInput: */ standardInputOf(words.slice(0, commandIndex)),
        );

        return request == null ? null : new CurlBashSnippet(request);
    }

    static from(snapshot: RequestSnapshot, options: SnippetOptions = DEFAULT_SNIPPET_PARTS): CurlBashSnippet {
        return new CurlBashSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        return CurlCommand.render(this.request, {
            lineContinuation: LINE_CONTINUATION,
            quote: ShellQuoting.posix,
            textBody: textBodyOf,
            preamble: () => null,
        });
    }
}
