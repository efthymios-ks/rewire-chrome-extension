import { CurlCommand } from './CurlCommand';
import { DEFAULT_SNIPPET_PARTS } from './DefaultSnippetParts';
import { CmdShellWords } from './Parsing/CmdShellWords';
import { CurlOptionParser } from './Parsing/CurlOptionParser';
import { RequestLines } from './Parsing/RequestLines';
import type { RequestSnapshot } from './RequestSnapshot';
import { RequestSnippetBase } from './RequestSnippetBase';
import { ShellQuoting } from './ShellQuoting';
import type { SnippetOptions } from './SnippetOptions';
import { SnippetRequests } from './SnippetRequests';

const LINE_CONTINUATION = ' ^\n  ';
const UTF8_CODE_PAGE = 'chcp 65001 >nul';
const COMMAND_NAME = 'curl';
const CMD_MARKER_PATTERN = /\^"|\^\r?\n|^\s*chcp\b/im;

export class CurlCmdSnippet extends RequestSnippetBase {
    static readonly id = 'curl-cmd';
    static readonly label = 'cURL (cmd)';

    static tryParse(text: string): CurlCmdSnippet | null {
        if (!CMD_MARKER_PATTERN.test(text)) {
            return null;
        }

        const words = CmdShellWords.split(text);
        const commandIndex = RequestLines.commandIndex(words, COMMAND_NAME);
        if (commandIndex === -1) {
            return null;
        }

        const request = CurlOptionParser.parse(
            /* args: */ RequestLines.argumentsAfter(words, commandIndex),
            /* standardInput: */ null,
        );

        return request == null ? null : new CurlCmdSnippet(request);
    }

    static from(snapshot: RequestSnapshot, options: SnippetOptions = DEFAULT_SNIPPET_PARTS): CurlCmdSnippet {
        return new CurlCmdSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        return CurlCommand.render(this.request, {
            lineContinuation: LINE_CONTINUATION,
            quote: ShellQuoting.cmd,
            textBody: text => ({
                pipe: null,
                argument: `--data-raw ${ShellQuoting.cmd(text)}`,
            }),
            preamble: command => ShellQuoting.hasNonAscii(command) ? UTF8_CODE_PAGE : null,
        });
    }
}
