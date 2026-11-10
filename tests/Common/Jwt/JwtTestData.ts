const Base64UrlReplacements: Record<string, string> = {
    "+": "-",
    "/": "_",
};
const Base64UrlPattern = /[+/]/g;
const PaddingPattern = /=+$/;

function partOf(value: object): string {
    return btoa(JSON.stringify(value))
        .replace(Base64UrlPattern, character => Base64UrlReplacements[character]!)
        .replace(PaddingPattern, "");
}

export function aToken(payload: object, header: object = {
    alg: "HS256",
    typ: "JWT",
}): string {
    return `${partOf(header)}.${partOf(payload)}.signature`;
}
