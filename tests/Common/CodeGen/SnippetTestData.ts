import { DefaultSnippetParts, type RequestSnapshot, type SnippetOptions } from "../../../src/Common/CodeGen/RequestSnapshot";
import type { HeaderEntry } from "../../../src/Contracts/Timeline/HeaderEntry";

export const Defaults: SnippetOptions = DefaultSnippetParts;

export function header(name: string, value: string): HeaderEntry {
    return {
        name,
        value,
    };
}

export function aSnapshot(overrides: Partial<RequestSnapshot> = {}): RequestSnapshot {
    return {
        method: "POST",
        url: "https://api.example.com/users?tag=a&tag=b",
        headers: [
            header("Content-Type", "application/json"),
            header("X-Tenant", "blue"),
            header("Cookie", "session=1"),
            header("Cookie", "theme=dark"),
            header(":authority", "api.example.com"),
            header("Content-Length", "13"),
            header("Host", "api.example.com"),
            header("Connection", "keep-alive"),
        ],
        body: "{\"name\":\"O'Neil\"}",
        ...overrides,
    };
}

export const MethodCases = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
    "PROPFIND",
];

export const FormCases = [
    [
        "application/x-www-form-urlencoded",
        "a=1&b=hello+world&c=%26%3D",
    ],
    [
        "multipart/form-data; boundary=----Boundary7",
        "------Boundary7\r\nContent-Disposition: form-data; name=\"title\"\r\n\r\nHello\r\n------Boundary7--\r\n",
    ],
    [
        "text/plain",
        "plain text",
    ],
    [
        "application/xml",
        "<a b=\"1\"/>",
    ],
];
