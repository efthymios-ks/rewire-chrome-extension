import { PosixShellWords } from "./Parsing/PosixShellWords";
import { RequestLines } from "./Parsing/RequestLines";
import { WgetOptionParser } from "./Parsing/WgetOptionParser";
import { DefaultSnippetParts, type RequestSnapshot, type SnippetOptions } from "./RequestSnapshot";
import { RequestSnippetBase } from "./RequestSnippetBase";
import { ShellQuoting } from "./ShellQuoting";
import { type SnippetBody, SnippetBodies, SnippetBodyKind } from "./SnippetBody";
import { SnippetHeaderNames, SnippetHeaders } from "./SnippetHeaders";
import { SnippetRequests } from "./SnippetRequest";

const LineContinuation = " \\\n  ";
const GetMethod = "GET";
const CommandName = "wget";
const MultipartNotice = "# wget can't send multipart forms, so the form is left out.";

function bodyArgumentOf(body: SnippetBody): string | null {
    switch (body.kind) {
        case SnippetBodyKind.Text:
            return `--body-data=${ShellQuoting.posix(body.text)}`;
        case SnippetBodyKind.File:
            return `--body-file=${ShellQuoting.posix(body.fileName)}`;
        case SnippetBodyKind.Multipart:
        case SnippetBodyKind.None:
            return null;
    }
}

export class WgetSnippet extends RequestSnippetBase {
    static readonly id = "wget";
    static readonly label = "Wget";

    static tryParse(text: string): WgetSnippet | null {
        const words = PosixShellWords.split(text);
        if (words === null) {
            return null;
        }

        const commandIndex = RequestLines.commandIndex(words, CommandName);
        if (commandIndex === -1) {
            return null;
        }

        const request = WgetOptionParser.parse(RequestLines.argumentsAfter(words, commandIndex));

        return request === null ? null : new WgetSnippet(request);
    }

    static from(snapshot: RequestSnapshot, options: SnippetOptions = DefaultSnippetParts): WgetSnippet {
        return new WgetSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        const request = this.request;
        const quote = ShellQuoting.posix;
        const cookie = SnippetRequests.cookieTextOf(request);
        const needsMethod = request.method !== GetMethod || SnippetBodies.hasBody(request.body);
        const headers = SnippetHeaders.without(request.headers, [SnippetHeaderNames.AcceptEncoding]);
        const segments = [
            "wget",
            needsMethod ? `--method=${request.method}` : null,
            ...headers.map(header => `--header=${quote(`${header.name}: ${header.value}`)}`),
            cookie === null ? null : `--header=${quote(`Cookie: ${cookie}`)}`,
            bodyArgumentOf(request.body),
            "--content-on-error",
            "-O -",
            quote(request.url),
        ];
        const command = segments
            .filter((segment): segment is string => segment !== null)
            .join(LineContinuation);

        return request.body.kind === SnippetBodyKind.Multipart ? `${MultipartNotice}\n${command}` : command;
    }
}
