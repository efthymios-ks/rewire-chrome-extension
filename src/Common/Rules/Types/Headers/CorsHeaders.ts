import { HEADER_NAMES } from '../../../../Contracts/Http/HeaderNames';
import { HTTP_METHODS } from '../../../../Contracts/Http/HttpMethods';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import { HeaderLookup } from '../../../Http/HeaderLookup';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import { CORS_DEFAULTS } from './CorsDefaults';

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

function firstNonEmpty(values: Array<string | null | undefined>, fallback: string): string {
    return values.find(value => value != null && value !== '') ?? fallback;
}

export const CorsHeaders = {
    isPreflight(request: RequestDraft): boolean {
        return request.method.toUpperCase() === HTTP_METHODS.Options
            && HeaderLookup.find(request.headers, HEADER_NAMES.AccessControlRequestMethod) != null;
    },

    echo(origin: string | null): HeaderEntry[] {
        if (origin == null) {
            return [];
        }

        return [
            header(HEADER_NAMES.AccessControlAllowOrigin, origin),
            header(HEADER_NAMES.AccessControlAllowCredentials, CORS_DEFAULTS.AllowCredentials),
            header(HEADER_NAMES.AccessControlExposeHeaders, CORS_DEFAULTS.ExposeAllHeaders),
            header(HEADER_NAMES.Vary, HEADER_NAMES.Origin),
        ];
    },

    forResponse(policy: CorsPolicy): HeaderEntry[] {
        const origin = firstNonEmpty([policy.allowedOrigin.trim()], CORS_DEFAULTS.AnyOrigin);
        const headers = [
            header(HEADER_NAMES.AccessControlAllowOrigin, origin),
            header(
                /* name: */ HEADER_NAMES.AccessControlAllowMethods,
                /* value: */ firstNonEmpty([policy.allowedMethods.trim()], CORS_DEFAULTS.AllowedMethods),
            ),
            header(
                /* name: */ HEADER_NAMES.AccessControlAllowHeaders,
                /* value: */ firstNonEmpty([policy.allowedHeaders.trim()], CORS_DEFAULTS.AllowedHeaders),
            ),
            header(HEADER_NAMES.AccessControlExposeHeaders, CORS_DEFAULTS.ExposeAllHeaders),
        ];
        if (origin === CORS_DEFAULTS.AnyOrigin) {
            return headers;
        }

        return [
            ...headers,
            header(HEADER_NAMES.AccessControlAllowCredentials, CORS_DEFAULTS.AllowCredentials),
        ];
    },

    forPreflight(request: RequestDraft, policy: CorsPolicy | null): HeaderEntry[] {
        const origin = HeaderLookup.find(request.headers, HEADER_NAMES.Origin);
        const requestedMethod = HeaderLookup.find(request.headers, HEADER_NAMES.AccessControlRequestMethod);
        const requestedHeaders = HeaderLookup.find(request.headers, HEADER_NAMES.AccessControlRequestHeaders);
        const allowedOrigin = firstNonEmpty([policy?.allowedOrigin.trim(), origin], CORS_DEFAULTS.AnyOrigin);

        return [
            header(HEADER_NAMES.AccessControlAllowOrigin, allowedOrigin),
            header(HEADER_NAMES.AccessControlAllowCredentials, CORS_DEFAULTS.AllowCredentials),
            header(
                /* name: */ HEADER_NAMES.AccessControlAllowMethods,
                /* value: */ firstNonEmpty(
                    /* values: */ [policy?.allowedMethods.trim(), requestedMethod],
                    /* fallback: */ CORS_DEFAULTS.AllowedMethods,
                ),
            ),
            header(
                /* name: */ HEADER_NAMES.AccessControlAllowHeaders,
                /* value: */ firstNonEmpty(
                    /* values: */ [policy?.allowedHeaders.trim(), requestedHeaders],
                    /* fallback: */ CORS_DEFAULTS.AllowedHeaders,
                ),
            ),
            header(
                /* name: */ HEADER_NAMES.AccessControlMaxAge,
                /* value: */ String(CORS_DEFAULTS.PreflightMaxAgeInSeconds),
            ),
            header(HEADER_NAMES.Vary, HEADER_NAMES.Origin),
        ];
    },
};
