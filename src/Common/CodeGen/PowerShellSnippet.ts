import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import { OwnEntry } from '../Objects/OwnEntry';
import { SafeUrl } from '../Urls/SafeUrl';
import { DEFAULT_SNIPPET_PARTS } from './DefaultSnippetParts';
import type { MultipartPart } from './MultipartPart';
import type { RequestSnapshot } from './RequestSnapshot';
import { RequestSnippetBase } from './RequestSnippetBase';
import { ShellQuoting } from './ShellQuoting';
import type { SnippetBody } from './SnippetBody';
import { SNIPPET_BODY_KIND } from './SnippetBodyKind';
import { SnippetHeaders } from './SnippetHeaders';
import type { SnippetOptions } from './SnippetOptions';
import type { SnippetRequest } from './SnippetRequest';
import { SnippetRequests } from './SnippetRequests';

const INDENTATION = '    ';
const COOKIE_PATH = '/';
const LINE_BREAK_SPLIT_PATTERN = /(\r\n|\n|\r)/;
const PARAMETERS_NAME = 'parameters';
const BLOCK_START = '& {';
const BLOCK_END = '}';
const RESPONSE_PRINTING = [
    'if ($PSVersionTable.PSVersion.Major -ge 7) {',
    `    $${PARAMETERS_NAME}.SkipHttpErrorCheck = $true`,
    '}',
    `$response = Invoke-WebRequest @${PARAMETERS_NAME}`,
    '"Status: $($response.StatusCode) $($response.StatusDescription)"',
    "$response.Headers.GetEnumerator() | ForEach-Object { \"$($_.Key): $($_.Value -join ', ')\" }",
    '""',
    '$response.Content',
];

const STANDARD_METHODS: Record<string, string> = Object.freeze({
    GET: 'Get',
    HEAD: 'Head',
    POST: 'Post',
    PUT: 'Put',
    DELETE: 'Delete',
    TRACE: 'Trace',
    OPTIONS: 'Options',
    MERGE: 'Merge',
    PATCH: 'Patch',
});

const LINE_BREAK_LITERALS: Record<string, string> = Object.freeze({
    '\r\n': '"`r`n"',
    '\n': '"`n"',
    '\r': '"`r"',
});

const PARAMETER_HEADERS = [
    HEADER_NAMES.ContentType,
    HEADER_NAMES.UserAgent,
    HEADER_NAMES.AcceptEncoding,
];

type Parameter = [string, string | null];

const quote = ShellQuoting.powerShell;

function methodParameter(method: string): Parameter {
    const standard = STANDARD_METHODS[method];

    return standard == null
        ? [
            'CustomMethod',
            quote(method),
        ]
        : [
            'Method',
            quote(standard),
        ];
}

function textExpression(text: string): string {
    const pieces = text
        .split(LINE_BREAK_SPLIT_PATTERN)
        .filter(piece => piece !== '');
    if (pieces.length <= 1) {
        return quote(text);
    }

    return `(${pieces.map(piece => OwnEntry.of(LINE_BREAK_LITERALS, piece) ?? quote(piece)).join(' + ')})`;
}

function sessionBlock(request: SnippetRequest): string[] {
    if (request.cookies.length === 0) {
        return [];
    }

    const host = SafeUrl.parse(request.url)?.hostname ?? '';

    return [
        '$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession',
        ...request.cookies.map(cookie => `$session.Cookies.Add((New-Object System.Net.Cookie(${[
            quote(cookie.name),
            quote(cookie.value),
            quote(COOKIE_PATH),
            quote(host),
        ].join(', ')})))`),
    ];
}

function hashtableOf(entries: Array<[string, string]>): string {
    return [
        '@{',
        ...entries.map(([name, value]) => `${INDENTATION}${INDENTATION}${quote(name)} = ${value}`),
        `${INDENTATION}}`,
    ].join('\n');
}

function headersExpression(request: SnippetRequest): string | null {
    const headers = SnippetHeaders.merged(SnippetHeaders.without(request.headers, PARAMETER_HEADERS));

    return headers.length === 0
        ? null
        : hashtableOf(headers.map(header => [
            header.name,
            quote(header.value),
        ]));
}

function formValueOf(part: MultipartPart): string {
    return part.fileName == null ? quote(part.value) : `Get-Item -LiteralPath ${quote(part.fileName)}`;
}

function bodyParameter(body: SnippetBody): Parameter {
    switch (body.kind) {
        case SNIPPET_BODY_KIND.Text:
            return [
                'Body',
                `[System.Text.Encoding]::UTF8.GetBytes(${textExpression(body.text)})`,
            ];
        case SNIPPET_BODY_KIND.File:
            return [
                'InFile',
                quote(body.fileName),
            ];
        case SNIPPET_BODY_KIND.Multipart:
            return [
                'Form',
                hashtableOf(body.parts.map(part => [
                    part.name,
                    formValueOf(part),
                ])),
            ];
        case SNIPPET_BODY_KIND.None:
            return [
                'Body',
                null,
            ];
    }
}

export class PowerShellSnippet extends RequestSnippetBase {
    static readonly id = 'powershell';
    static readonly label = 'PowerShell';

    static tryParse(_text: string): PowerShellSnippet | null {
        return null;
    }

    static from(
        snapshot: RequestSnapshot,
        options: SnippetOptions = DEFAULT_SNIPPET_PARTS,
    ): PowerShellSnippet {
        return new PowerShellSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        const request = this.request;
        const isMultipart = request.body.kind === SNIPPET_BODY_KIND.Multipart;
        const contentType = isMultipart
            ? undefined
            : SnippetHeaders.find(request.headers, HEADER_NAMES.ContentType);
        const userAgent = SnippetHeaders.find(request.headers, HEADER_NAMES.UserAgent);
        const session = sessionBlock(request);
        const body: Parameter = SnippetRequests.isBodyless(request.method)
            ? [
                'Body',
                null,
            ]
            : bodyParameter(request.body);
        const parameters: Parameter[] = [
            [
                'Uri',
                quote(request.url),
            ],
            methodParameter(request.method),
            [
                'WebSession',
                session.length === 0 ? null : '$session',
            ],
            [
                'Headers',
                headersExpression(request),
            ],
            [
                'UserAgent',
                userAgent == null ? null : quote(userAgent.value),
            ],
            [
                'ContentType',
                contentType == null ? null : quote(contentType.value),
            ],
            body,
            [
                'UseBasicParsing',
                '$true',
            ],
        ];

        const statements = [
            ...session,
            `$${PARAMETERS_NAME} = @{`,
            ...parameters
                .filter((parameter): parameter is [string, string] => parameter[1] != null)
                .map(([name, value]) => `${INDENTATION}${name} = ${value}`),
            '}',
            ...RESPONSE_PRINTING,
        ];

        return [
            BLOCK_START,
            ...statements
                .join('\n')
                .split('\n')
                .map(line => `${INDENTATION}${line}`),
            BLOCK_END,
        ].join('\n');
    }
}
