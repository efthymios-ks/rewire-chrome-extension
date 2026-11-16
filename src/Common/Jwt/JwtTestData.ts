const BASE64_URL_REPLACEMENTS: Record<string, string> = Object.freeze({
    '+': '-',
    '/': '_',
});
const BASE64_URL_PATTERN = /[+/]/g;
const PADDING_PATTERN = /=+$/;

function partOf(value: object): string {
    return btoa(JSON.stringify(value))
        .replace(BASE64_URL_PATTERN, character => BASE64_URL_REPLACEMENTS[character]!)
        .replace(PADDING_PATTERN, '');
}

export function aToken(payload: object, header: object = {
    alg: 'HS256',
    typ: 'JWT',
}): string {
    return `${partOf(header)}.${partOf(payload)}.signature`;
}
