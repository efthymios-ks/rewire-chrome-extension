import { SafeUrl } from "../Urls/SafeUrl";
import { DefaultSnippetParts, type RequestSnapshot, type SnippetOptions } from "./RequestSnapshot";
import { RequestSnippetBase } from "./RequestSnippetBase";
import { ShellQuoting } from "./ShellQuoting";
import { type MultipartPart, type SnippetBody, SnippetBodyKind } from "./SnippetBody";
import { SnippetHeaderNames, SnippetHeaders } from "./SnippetHeaders";
import { type SnippetRequest, SnippetRequests } from "./SnippetRequest";

const Indentation = "    ";
const CookiePath = "/";
const LineBreakSplitPattern = /(\r\n|\n|\r)/;
const ParametersName = "parameters";
const BlockStart = "& {";
const BlockEnd = "}";
const ResponsePrinting = [
    "if ($PSVersionTable.PSVersion.Major -ge 7) {",
    `    $${ParametersName}.SkipHttpErrorCheck = $true`,
    "}",
    `$response = Invoke-WebRequest @${ParametersName}`,
    "\"Status: $($response.StatusCode) $($response.StatusDescription)\"",
    "$response.Headers.GetEnumerator() | ForEach-Object { \"$($_.Key): $($_.Value -join ', ')\" }",
    "\"\"",
    "$response.Content",
];

const StandardMethods: Record<string, string> = {
    GET: "Get",
    HEAD: "Head",
    POST: "Post",
    PUT: "Put",
    DELETE: "Delete",
    TRACE: "Trace",
    OPTIONS: "Options",
    MERGE: "Merge",
    PATCH: "Patch",
};

const LineBreakLiterals: Record<string, string> = {
    "\r\n": "\"`r`n\"",
    "\n": "\"`n\"",
    "\r": "\"`r\"",
};

const ParameterHeaders = [
    SnippetHeaderNames.ContentType,
    SnippetHeaderNames.UserAgent,
    SnippetHeaderNames.AcceptEncoding,
];

type Parameter = [string, string | null];

const quote = ShellQuoting.powerShell;

function methodParameter(method: string): Parameter {
    const standard = StandardMethods[method];

    return standard === undefined
        ? [
            "CustomMethod",
            quote(method),
        ]
        : [
            "Method",
            quote(standard),
        ];
}

function textExpression(text: string): string {
    const pieces = text
        .split(LineBreakSplitPattern)
        .filter(piece => piece !== "");
    if (pieces.length <= 1) {
        return quote(text);
    }

    return `(${pieces.map(piece => LineBreakLiterals[piece] ?? quote(piece)).join(" + ")})`;
}

function sessionBlock(request: SnippetRequest): string[] {
    if (request.cookies.length === 0) {
        return [];
    }

    const host = SafeUrl.parse(request.url)?.hostname ?? "";

    return [
        "$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession",
        ...request.cookies.map(cookie => `$session.Cookies.Add((New-Object System.Net.Cookie(${[
            quote(cookie.name),
            quote(cookie.value),
            quote(CookiePath),
            quote(host),
        ].join(", ")})))`),
    ];
}

function hashtableOf(entries: Array<[string, string]>): string {
    return [
        "@{",
        ...entries.map(([name, value]) => `${Indentation}${Indentation}${quote(name)} = ${value}`),
        `${Indentation}}`,
    ].join("\n");
}

function headersExpression(request: SnippetRequest): string | null {
    const headers = SnippetHeaders.merged(SnippetHeaders.without(request.headers, ParameterHeaders));

    return headers.length === 0
        ? null
        : hashtableOf(headers.map(header => [
            header.name,
            quote(header.value),
        ]));
}

function formValueOf(part: MultipartPart): string {
    return part.fileName === null ? quote(part.value) : `Get-Item -LiteralPath ${quote(part.fileName)}`;
}

function bodyParameter(body: SnippetBody): Parameter {
    switch (body.kind) {
        case SnippetBodyKind.Text:
            return [
                "Body",
                `[System.Text.Encoding]::UTF8.GetBytes(${textExpression(body.text)})`,
            ];
        case SnippetBodyKind.File:
            return [
                "InFile",
                quote(body.fileName),
            ];
        case SnippetBodyKind.Multipart:
            return [
                "Form",
                hashtableOf(body.parts.map(part => [
                    part.name,
                    formValueOf(part),
                ])),
            ];
        case SnippetBodyKind.None:
            return [
                "Body",
                null,
            ];
    }
}

export class PowerShellSnippet extends RequestSnippetBase {
    static readonly id = "powershell";
    static readonly label = "PowerShell";

    static tryParse(_text: string): PowerShellSnippet | null {
        return null;
    }

    static from(snapshot: RequestSnapshot, options: SnippetOptions = DefaultSnippetParts): PowerShellSnippet {
        return new PowerShellSnippet(SnippetRequests.of(snapshot, options));
    }

    override toString(): string {
        const request = this.request;
        const isMultipart = request.body.kind === SnippetBodyKind.Multipart;
        const contentType = isMultipart ? undefined : SnippetHeaders.find(request.headers, SnippetHeaderNames.ContentType);
        const userAgent = SnippetHeaders.find(request.headers, SnippetHeaderNames.UserAgent);
        const session = sessionBlock(request);
        const body: Parameter = SnippetRequests.isBodyless(request.method)
            ? [
                "Body",
                null,
            ]
            : bodyParameter(request.body);
        const parameters: Parameter[] = [
            [
                "Uri",
                quote(request.url),
            ],
            methodParameter(request.method),
            [
                "WebSession",
                session.length === 0 ? null : "$session",
            ],
            [
                "Headers",
                headersExpression(request),
            ],
            [
                "UserAgent",
                userAgent === undefined ? null : quote(userAgent.value),
            ],
            [
                "ContentType",
                contentType === undefined ? null : quote(contentType.value),
            ],
            body,
            [
                "UseBasicParsing",
                "$true",
            ],
        ];

        const statements = [
            ...session,
            `$${ParametersName} = @{`,
            ...parameters
                .filter((parameter): parameter is [string, string] => parameter[1] !== null)
                .map(([name, value]) => `${Indentation}${name} = ${value}`),
            "}",
            ...ResponsePrinting,
        ];

        return [
            BlockStart,
            ...statements
                .join("\n")
                .split("\n")
                .map(line => `${Indentation}${line}`),
            BlockEnd,
        ].join("\n");
    }
}
