import { HeaderNames } from "../../../../Contracts/Http/HeaderNames";
import { HttpMethods } from "../../../../Contracts/Http/HttpMethods";
import type { HeaderEntry } from "../../../../Contracts/Timeline/HeaderEntry";
import type { RequestDraft } from "../../Drafts/Drafts";
import { HeaderList } from "../../Http/HeaderList";

export const CorsDefaults = {
    AllowedMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    AllowedHeaders: "Authorization, Content-Type, X-Requested-With",
    AnyOrigin: "*",
    AllowCredentials: "true",
    ExposeAllHeaders: "*",
    PreflightMaxAgeInSeconds: 600,
} as const;

export interface CorsPolicy {
    allowedOrigin: string;
    allowedMethods: string;
    allowedHeaders: string;
}

function header(name: string, value: string): HeaderEntry {
    return {
        name,
        value,
    };
}

export const CorsHeaders = {
    isPreflight(request: RequestDraft): boolean {
        return request.method.toUpperCase() === HttpMethods.Options
            && HeaderList.first(request.headers, HeaderNames.AccessControlRequestMethod) !== null;
    },

    echo(origin: string | null): HeaderEntry[] {
        if (origin === null) {
            return [];
        }

        return [
            header(HeaderNames.AccessControlAllowOrigin, origin),
            header(HeaderNames.AccessControlAllowCredentials, CorsDefaults.AllowCredentials),
            header(HeaderNames.AccessControlExposeHeaders, CorsDefaults.ExposeAllHeaders),
            header(HeaderNames.Vary, HeaderNames.Origin),
        ];
    },

    forResponse(policy: CorsPolicy): HeaderEntry[] {
        const origin = policy.allowedOrigin.trim() || CorsDefaults.AnyOrigin;
        const headers = [
            header(HeaderNames.AccessControlAllowOrigin, origin),
            header(HeaderNames.AccessControlAllowMethods, policy.allowedMethods.trim() || CorsDefaults.AllowedMethods),
            header(HeaderNames.AccessControlAllowHeaders, policy.allowedHeaders.trim() || CorsDefaults.AllowedHeaders),
            header(HeaderNames.AccessControlExposeHeaders, CorsDefaults.ExposeAllHeaders),
        ];
        if (origin === CorsDefaults.AnyOrigin) {
            return headers;
        }

        return [
            ...headers,
            header(HeaderNames.AccessControlAllowCredentials, CorsDefaults.AllowCredentials),
        ];
    },

    forPreflight(request: RequestDraft, policy: CorsPolicy | null): HeaderEntry[] {
        const origin = HeaderList.first(request.headers, HeaderNames.Origin);
        const requestedMethod = HeaderList.first(request.headers, HeaderNames.AccessControlRequestMethod);
        const requestedHeaders = HeaderList.first(request.headers, HeaderNames.AccessControlRequestHeaders);
        const allowedOrigin = policy?.allowedOrigin.trim() || origin || CorsDefaults.AnyOrigin;

        return [
            header(HeaderNames.AccessControlAllowOrigin, allowedOrigin),
            header(HeaderNames.AccessControlAllowCredentials, CorsDefaults.AllowCredentials),
            header(HeaderNames.AccessControlAllowMethods, policy?.allowedMethods.trim() || requestedMethod || CorsDefaults.AllowedMethods),
            header(HeaderNames.AccessControlAllowHeaders, policy?.allowedHeaders.trim() || requestedHeaders || CorsDefaults.AllowedHeaders),
            header(HeaderNames.AccessControlMaxAge, String(CorsDefaults.PreflightMaxAgeInSeconds)),
            header(HeaderNames.Vary, HeaderNames.Origin),
        ];
    },
};
