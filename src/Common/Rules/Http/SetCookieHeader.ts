import type { SetCookie } from './SetCookie';

const ATTRIBUTE_SEPARATOR = ';';
const VALUE_SEPARATOR = '=';

interface AttributeHandler {
    name: string;
    apply(cookie: SetCookie, value: string): SetCookie;
}

const ATTRIBUTE_HANDLERS: AttributeHandler[] = [
    {
        name: 'domain',
        apply: (cookie, value) => ({
            ...cookie,
            domain: value,
        }),
    },
    {
        name: 'path',
        apply: (cookie, value) => ({
            ...cookie,
            path: value,
        }),
    },
    {
        name: 'expires',
        apply: (cookie, value) => ({
            ...cookie,
            expires: value,
        }),
    },
    {
        name: 'max-age',
        apply: (cookie, value) => ({
            ...cookie,
            maxAge: value,
        }),
    },
    {
        name: 'secure',
        apply: cookie => ({
            ...cookie,
            secure: true,
        }),
    },
    {
        name: 'httponly',
        apply: cookie => ({
            ...cookie,
            httpOnly: true,
        }),
    },
    {
        name: 'samesite',
        apply: (cookie, value) => ({
            ...cookie,
            sameSite: value,
        }),
    },
    {
        name: 'partitioned',
        apply: cookie => ({
            ...cookie,
            partitioned: true,
        }),
    },
];

function splitPair(part: string): [string, string] {
    const separatorIndex = part.indexOf(VALUE_SEPARATOR);
    if (separatorIndex === -1) {
        return [
            part.trim(),
            '',
        ];
    }

    return [
        part.slice(0, separatorIndex).trim(),
        part.slice(separatorIndex + 1).trim(),
    ];
}

export const SetCookieHeader = {
    empty(name: string, value: string): SetCookie {
        return {
            name,
            value,
            domain: '',
            path: '',
            expires: '',
            maxAge: '',
            secure: false,
            httpOnly: false,
            sameSite: '',
            partitioned: false,
        };
    },

    parse(header: string): SetCookie {
        const [first = '', ...attributes] = header.split(ATTRIBUTE_SEPARATOR);
        const [name, value] = splitPair(first);

        return attributes.reduce(
            /* callbackfn: */ (cookie, attribute) => {
                const [attributeName, attributeValue] = splitPair(attribute);
                const handlerName = attributeName.toLowerCase();
                const handler = ATTRIBUTE_HANDLERS.find(candidate => candidate.name === handlerName);

                return handler == null ? cookie : handler.apply(cookie, attributeValue);
            },
            /* initialValue: */ SetCookieHeader.empty(name, value),
        );
    },

    serialize(cookie: SetCookie): string {
        const parts = [
            `${cookie.name}${VALUE_SEPARATOR}${cookie.value}`,
            cookie.domain === '' ? '' : `Domain=${cookie.domain}`,
            cookie.path === '' ? '' : `Path=${cookie.path}`,
            cookie.expires === '' ? '' : `Expires=${cookie.expires}`,
            cookie.maxAge === '' ? '' : `Max-Age=${cookie.maxAge}`,
            cookie.secure ? 'Secure' : '',
            cookie.httpOnly ? 'HttpOnly' : '',
            cookie.sameSite === '' ? '' : `SameSite=${cookie.sameSite}`,
            cookie.partitioned ? 'Partitioned' : '',
        ];

        return parts
            .filter(part => part !== '')
            .join(`${ATTRIBUTE_SEPARATOR} `);
    },
};
