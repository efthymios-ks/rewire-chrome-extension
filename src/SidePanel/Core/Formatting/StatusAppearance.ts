import { TimelineEntryState } from "../../../Contracts/Timeline/TimelineEntryState";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";

interface StatusRange {
    min: number;
    max: number;
    className: string;
}

const StatusRanges: StatusRange[] = [
    {
        min: 100,
        max: 299,
        className: "status-ok",
    },
    {
        min: 300,
        max: 399,
        className: "status-redirect",
    },
    {
        min: 400,
        max: 499,
        className: "status-client-error",
    },
    {
        min: 500,
        max: 599,
        className: "status-server-error",
    },
];

const PendingClassName = "status-pending";
const FailedClassName = "status-failed";
const PendingText = "...";
const FailedText = "ERR";

const StandardReasonPhrases: Record<number, string> = {
    100: "Continue",
    101: "Switching Protocols",
    102: "Processing",
    103: "Early Hints",
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    207: "Multi-Status",
    208: "Already Reported",
    226: "IM Used",
    300: "Multiple Choices",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    308: "Permanent Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Payload Too Large",
    414: "URI Too Long",
    415: "Unsupported Media Type",
    416: "Range Not Satisfiable",
    417: "Expectation Failed",
    418: "I'm a teapot",
    421: "Misdirected Request",
    422: "Unprocessable Entity",
    423: "Locked",
    424: "Failed Dependency",
    425: "Too Early",
    426: "Upgrade Required",
    428: "Precondition Required",
    429: "Too Many Requests",
    431: "Request Header Fields Too Large",
    451: "Unavailable For Legal Reasons",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
    506: "Variant Also Negotiates",
    507: "Insufficient Storage",
    508: "Loop Detected",
    510: "Not Extended",
    511: "Network Authentication Required",
};

export const StatusAppearance = {
    classOf(entry: TimelineEntrySummary): string {
        if (entry.state === TimelineEntryState.Failed) {
            return FailedClassName;
        }

        return entry.statusCode === null ? PendingClassName : StatusAppearance.classOfCode(entry.statusCode);
    },

    classOfCode(statusCode: number): string {
        const range = StatusRanges.find(candidate => statusCode >= candidate.min && statusCode <= candidate.max);

        return range?.className ?? PendingClassName;
    },

    textOf(entry: TimelineEntrySummary): string {
        if (entry.state === TimelineEntryState.Failed) {
            return FailedText;
        }

        return entry.statusCode === null ? PendingText : String(entry.statusCode);
    },

    describeOf(entry: TimelineEntrySummary): string {
        if (entry.state === TimelineEntryState.Failed || entry.statusCode === null) {
            return StatusAppearance.textOf(entry);
        }

        return StatusAppearance.lineOf(entry.statusCode, entry.statusText);
    },

    lineOf(statusCode: number, statusText: string): string {
        const phrase = statusText.trim() || StandardReasonPhrases[statusCode] || "";

        return phrase === "" ? String(statusCode) : `${statusCode} ${phrase}`;
    },
};
