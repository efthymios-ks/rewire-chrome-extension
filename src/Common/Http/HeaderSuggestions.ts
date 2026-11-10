import { HeaderNames } from "../../Contracts/Http/HeaderNames";
import { MediaTypeNames } from "../../Contracts/Http/MediaTypeNames";

export interface HeaderValueSuggestion {
    matches(headerName: string): boolean;
    values(): readonly string[];
}

const AnyValue = "*";
const AnyMediaType = "*/*";

function sorted(values: readonly string[]): readonly string[] {
    return values.toSorted((left, right) => left.localeCompare(right, undefined, {
        sensitivity: "base",
    }));
}

const MediaTypeList = sorted(Object.values(MediaTypeNames));

function isOneOf(...names: string[]): (headerName: string) => boolean {
    const lowerNames = names.map(name => name.toLowerCase());

    return headerName => lowerNames.includes(headerName.trim().toLowerCase());
}

const Rules: HeaderValueSuggestion[] = [
    {
        matches: isOneOf(HeaderNames.ContentType),
        values: () => MediaTypeList,
    },
    {
        matches: isOneOf(HeaderNames.Accept),
        values: () => [
            AnyMediaType,
            ...MediaTypeList,
        ],
    },
    {
        matches: isOneOf(
            HeaderNames.AcceptEncoding,
            HeaderNames.ContentEncoding,
            HeaderNames.GrpcAcceptEncoding,
            HeaderNames.GrpcEncoding
        ),
        values: () => [
            "gzip",
            "deflate",
            "br",
            "zstd",
            "identity",
        ],
    },
    {
        matches: isOneOf(HeaderNames.CacheControl),
        values: () => [
            "no-cache",
            "no-store",
            "max-age=0",
            "must-revalidate",
            "private",
            "public",
        ],
    },
    {
        matches: isOneOf(HeaderNames.Pragma),
        values: () => ["no-cache"],
    },
    {
        matches: isOneOf(HeaderNames.Connection),
        values: () => [
            "keep-alive",
            "close",
        ],
    },
    {
        matches: isOneOf(HeaderNames.AccessControlAllowOrigin, HeaderNames.AccessControlAllowHeaders),
        values: () => [AnyValue],
    },
    {
        matches: isOneOf(HeaderNames.AccessControlAllowMethods, HeaderNames.AccessControlRequestMethod),
        values: () => [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
    },
    {
        matches: isOneOf(HeaderNames.AccessControlAllowCredentials),
        values: () => ["true"],
    },
    {
        matches: isOneOf(HeaderNames.ContentDisposition),
        values: () => [
            "attachment",
            "inline",
        ],
    },
    {
        matches: isOneOf(HeaderNames.XRequestedWith),
        values: () => ["XMLHttpRequest"],
    },
    {
        matches: isOneOf(HeaderNames.XContentTypeOptions),
        values: () => ["nosniff"],
    },
    {
        matches: isOneOf(HeaderNames.XFrameOptions),
        values: () => [
            "DENY",
            "SAMEORIGIN",
        ],
    },
];

export const HeaderSuggestions = {
    names(): readonly string[] {
        return sorted(Object.values(HeaderNames));
    },

    mediaTypes(): readonly string[] {
        return MediaTypeList;
    },

    valuesFor(headerName: string): readonly string[] {
        return [...new Set(Rules
            .filter(rule => rule.matches(headerName))
            .flatMap(rule => rule.values()))];
    },
};
