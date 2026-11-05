export interface StatusCodePreset {
    code: number;
    phrase: string;
}

export const StatusCodeLimits = {
    Min: 100,
    Max: 599,
    DefaultMock: 200,
    NoContent: 204,
} as const;

export const StatusCodePresets: StatusCodePreset[] = [
    {
        code: 200,
        phrase: "OK",
    },
    {
        code: 201,
        phrase: "Created",
    },
    {
        code: 204,
        phrase: "No Content",
    },
    {
        code: 400,
        phrase: "Bad Request",
    },
    {
        code: 401,
        phrase: "Unauthorized",
    },
    {
        code: 403,
        phrase: "Forbidden",
    },
    {
        code: 404,
        phrase: "Not Found",
    },
    {
        code: 409,
        phrase: "Conflict",
    },
    {
        code: 422,
        phrase: "Unprocessable Content",
    },
    {
        code: 429,
        phrase: "Too Many Requests",
    },
    {
        code: 500,
        phrase: "Internal Server Error",
    },
    {
        code: 502,
        phrase: "Bad Gateway",
    },
    {
        code: 503,
        phrase: "Service Unavailable",
    },
    {
        code: 504,
        phrase: "Gateway Timeout",
    },
];
