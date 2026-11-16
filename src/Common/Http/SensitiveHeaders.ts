const SENSITIVE_HEADER_NAMES = [
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'api-key',
    'x-auth-token',
];

export const SensitiveHeaders = {
    isSensitive(name: string): boolean {
        return SENSITIVE_HEADER_NAMES.includes(name.trim().toLowerCase());
    },
};
