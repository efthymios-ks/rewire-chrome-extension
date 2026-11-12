const SensitiveHeaderNames = [
    "authorization",
    "proxy-authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "api-key",
    "x-auth-token",
];

export const SensitiveHeaders = {
    isSensitive(name: string): boolean {
        return SensitiveHeaderNames.includes(name.trim().toLowerCase());
    },
};
