import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import { DEFAULT_SNIPPET_PARTS } from './DefaultSnippetParts';
import { PosixShellWords } from './Parsing/PosixShellWords';
import { RequestLines } from './Parsing/RequestLines';
import { WgetOptionParser } from './Parsing/WgetOptionParser';
import type { RequestSnapshot } from './RequestSnapshot';
import { RequestSnippetBase } from './RequestSnippetBase';
import { ShellQuoting } from './ShellQuoting';
import { SnippetBodies } from './SnippetBodies';
import type { SnippetBody } from './SnippetBody';
import { SNIPPET_BODY_KIND } from './SnippetBodyKind';
import { SnippetHeaders } from './SnippetHeaders';
import type { SnippetOptions } from './SnippetOptions';
import { SnippetRequests } from './SnippetRequests';

const LINE_CONTINUATION = ' \\\n  ';
const GET_METHOD = 'GET';
const COMMAND_NAME = 'wget';
const MULTIPART_NOTICE = "# wget can't send multipart forms, so the form is left out.";

function bodyArgumentOf(body: SnippetBody): string | null {
    switch (body.kind) {
        case SNIPPET_BODY_KIND.Text:
            return `--body-data=${ShellQuoting.posix(body.text)}`;
        case SNIPPET_BODY_KIND.File:
            return `--body-file=${ShellQuoting.posix(body.fileName)}`;
        case SNIPPET_BODY_KIND.Multipart:
        case SNIPPET_BODY_KIND.None:
            return null;
    }
}

export class WgetSnippet extends RequestSnippetBase {
    static readonly id = 'wget';
    static readonly label = 'Wget';

    static tryParse(text: string): WgetSnippet | null {
        const words = PosixShellWords.split(text);
        if (words == null) {
            return null;
        }

        const commandIndex = RequestLines.commandIndex(words, COMMAND_NAME);
        if (commandIndex === -1) {
            return null;
        }

        const request = WgetOptionParser.parse(RequestLines.argumentsAfter(words, commandIndex));

        return request == null ? null : new WgetSnippet(request);
    }

    static from(snapshot: RequestSnapshot, options: SnippetOptions = DEFAULT_SNIPPET_PARTS): WgetSnippet {
        return new WgetSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        const request = this.request;
        const quote = ShellQuoting.posix;
        const cookie = SnippetRequests.cookieTextOf(request);
        const needsMethod = request.method !== GET_METHOD || SnippetBodies.hasBody(request.body);
        const headers = SnippetHeaders.without(request.headers, [HEADER_NAMES.AcceptEncoding]);
        const segments = [
            'wget',
            needsMethod ? `--method=${request.method}` : null,
            ...headers.map(header => `--header=${quote(`${header.name}: ${header.value}`)}`),
            cookie == null ? null : `--header=${quote(`Cookie: ${cookie}`)}`,
            bodyArgumentOf(request.body),
            '--content-on-error',
            '-O -',
            quote(request.url),
        ];
        const command = segments
            .filter((segment): segment is string => segment != null)
            .join(LINE_CONTINUATION);

        return request.body.kind === SNIPPET_BODY_KIND.Multipart
            ? `${MULTIPART_NOTICE}\n${command}`
            : command;
    }
}
