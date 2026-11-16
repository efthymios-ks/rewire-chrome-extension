export const SAME_SITE_LABELS: Readonly<Record<chrome.cookies.Cookie['sameSite'], string>> = Object.freeze({
    unspecified: 'Not set (Lax)',
    lax: 'Lax',
    strict: 'Strict',
    no_restriction: 'None',
});
