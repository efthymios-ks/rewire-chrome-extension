import { HEADER_NAMES } from '../../Contracts/Http/HeaderNames';
import { HTTP_METHODS } from '../../Contracts/Http/HttpMethods';
import { MEDIA_TYPE_NAMES } from '../../Contracts/Http/MediaTypeNames';

export interface HeaderValueSuggestion {
    matches(headerName: string): boolean;
    values(): readonly string[];
}

const ANY_VALUE = '*';
const ANY_MEDIA_TYPE = '*/*';

function sorted(values: readonly string[]): readonly string[] {
    return values.toSorted((left, right) => left.localeCompare(
        /* that: */ right,
        /* locales: */ undefined,
        /* options: */ {
            sensitivity: 'base',
        },
    ));
}

const MEDIA_TYPE_LIST = sorted(Object.values(MEDIA_TYPE_NAMES));

function isOneOf(...names: string[]): (headerName: string) => boolean {
    const lowerNames = names.map(name => name.toLowerCase());

    return headerName => lowerNames.includes(headerName.trim().toLowerCase());
}

const RULES: HeaderValueSuggestion[] = [
    {
        matches: isOneOf(HEADER_NAMES.ContentType),
        values: () => MEDIA_TYPE_LIST,
    },
    {
        matches: isOneOf(HEADER_NAMES.Accept),
        values: () => [
            ANY_MEDIA_TYPE,
            ...MEDIA_TYPE_LIST,
        ],
    },
    {
        matches: isOneOf(
            /* names: */ HEADER_NAMES.AcceptEncoding,
            /* names: */ HEADER_NAMES.ContentEncoding,
            /* names: */ HEADER_NAMES.GrpcAcceptEncoding,
            /* names: */ HEADER_NAMES.GrpcEncoding,
        ),
        values: () => [
            'gzip',
            'deflate',
            'br',
            'zstd',
            'identity',
        ],
    },
    {
        matches: isOneOf(HEADER_NAMES.CacheControl),
        values: () => [
            'no-cache',
            'no-store',
            'max-age=0',
            'must-revalidate',
            'private',
            'public',
        ],
    },
    {
        matches: isOneOf(HEADER_NAMES.Pragma),
        values: () => ['no-cache'],
    },
    {
        matches: isOneOf(HEADER_NAMES.Connection),
        values: () => [
            'keep-alive',
            'close',
        ],
    },
    {
        matches: isOneOf(HEADER_NAMES.AccessControlAllowOrigin, HEADER_NAMES.AccessControlAllowHeaders),
        values: () => [ANY_VALUE],
    },
    {
        matches: isOneOf(HEADER_NAMES.AccessControlAllowMethods, HEADER_NAMES.AccessControlRequestMethod),
        values: () => [
            HTTP_METHODS.Get,
            HTTP_METHODS.Post,
            HTTP_METHODS.Put,
            HTTP_METHODS.Patch,
            HTTP_METHODS.Delete,
            HTTP_METHODS.Options,
        ],
    },
    {
        matches: isOneOf(HEADER_NAMES.AccessControlAllowCredentials),
        values: () => ['true'],
    },
    {
        matches: isOneOf(HEADER_NAMES.ContentDisposition),
        values: () => [
            'attachment',
            'inline',
        ],
    },
    {
        matches: isOneOf(HEADER_NAMES.XRequestedWith),
        values: () => ['XMLHttpRequest'],
    },
    {
        matches: isOneOf(HEADER_NAMES.XContentTypeOptions),
        values: () => ['nosniff'],
    },
    {
        matches: isOneOf(HEADER_NAMES.XFrameOptions),
        values: () => [
            'DENY',
            'SAMEORIGIN',
        ],
    },
];

export const HeaderSuggestions = {
    names(): readonly string[] {
        return sorted(Object.values(HEADER_NAMES));
    },

    mediaTypes(): readonly string[] {
        return MEDIA_TYPE_LIST;
    },

    valuesFor(headerName: string): readonly string[] {
        return [...new Set(RULES
            .filter(rule => rule.matches(headerName))
            .flatMap(rule => rule.values()))];
    },
};
