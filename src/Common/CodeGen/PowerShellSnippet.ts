import { SafeUrl } from "../Urls/SafeUrl";
import { CookieHeader } from "../Rules/Http/CookieHeader";
import type { ISnippetGenerator, RequestSnapshot, SnippetOptions } from "./RequestSnapshot";
import { type SnippetParts as Parts, SnippetHeaderNames, SnippetParts } from "./SnippetParts";

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

function methodParameter(method: string): Parameter {
    const standard = StandardMethods[method];

    return standard === undefined
        ? [
            "CustomMethod",
            SnippetParts.powerShellQuote(method),
        ]
        : [
            "Method",
            SnippetParts.powerShellQuote(standard),
        ];
}

function textExpression(text: string): string {
    const pieces = text
        .split(LineBreakSplitPattern)
        .filter(piece => piece !== "");
    if (pieces.length <= 1) {
        return SnippetParts.powerShellQuote(text);
    }

    return `(${pieces.map(piece => LineBreakLiterals[piece] ?? SnippetParts.powerShellQuote(piece)).join(" + ")})`;
}

function sessionBlock(parts: Parts): string[] {
    if (parts.cookie === null) {
        return [];
    }

    const host = SafeUrl.parse(parts.url)?.hostname ?? "";
    const quote = SnippetParts.powerShellQuote;

    return [
        "$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession",
        ...CookieHeader
            .parse(parts.cookie)
            .map(cookie => `$session.Cookies.Add((New-Object System.Net.Cookie(${[
                quote(cookie.name),
                quote(cookie.value),
                quote(CookiePath),
                quote(host),
            ].join(", ")})))`),
    ];
}

function headersExpression(parts: Parts): string | null {
    const headers = SnippetParts.merged(SnippetParts.without(parts.headers, ParameterHeaders));
    if (headers.length === 0) {
        return null;
    }

    const quote = SnippetParts.powerShellQuote;

    return [
        "@{",
        ...headers.map(header => `${Indentation}${Indentation}${quote(header.name)} = ${quote(header.value)}`),
        `${Indentation}}`,
    ].join("\n");
}

export class PowerShellSnippet implements ISnippetGenerator {
    readonly id = "powershell";
    readonly label = "PowerShell";

    generate(snapshot: RequestSnapshot, options: SnippetOptions): string {
        const parts = SnippetParts.of(snapshot, options);
        const quote = SnippetParts.powerShellQuote;
        const contentType = SnippetParts.find(parts.headers, SnippetHeaderNames.ContentType);
        const userAgent = SnippetParts.find(parts.headers, SnippetHeaderNames.UserAgent);
        const session = sessionBlock(parts);
        const body = SnippetParts.isBodyless(parts.method) ? null : parts.body;
        const parameters: Parameter[] = [
            [
                "Uri",
                quote(parts.url),
            ],
            methodParameter(parts.method),
            [
                "WebSession",
                session.length === 0 ? null : "$session",
            ],
            [
                "Headers",
                headersExpression(parts),
            ],
            [
                "UserAgent",
                userAgent === undefined ? null : quote(userAgent.value),
            ],
            [
                "ContentType",
                contentType === undefined ? null : quote(contentType.value),
            ],
            [
                "Body",
                body === null ? null : `[System.Text.Encoding]::UTF8.GetBytes(${textExpression(body)})`,
            ],
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
