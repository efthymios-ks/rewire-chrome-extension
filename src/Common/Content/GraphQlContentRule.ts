import { MEDIA_TYPES } from '../../Contracts/Http/MediaTypes';
import { CONTENT_KIND } from '../../Contracts/Timeline/ContentKind';
import { JsonText } from '../Json/JsonText';
import { SafeUrl } from '../Urls/SafeUrl';
import type { ContentSignals } from './ContentSignals';
import { GRAPHQL_QUERY_KEY } from './GraphQlQueryKey';
import type { ContentKindRule } from './ContentKindRule';

const GRAPHQL_PATH_PATTERN = /\/graphql(?:\/|$)/i;

function isGraphQlOperation(value: unknown): boolean {
    return typeof value === 'object'
        && value != null
        && typeof (value as Record<string, unknown>)[GRAPHQL_QUERY_KEY] === 'string';
}

export class GraphQlContentRule implements ContentKindRule {
    readonly kind = CONTENT_KIND.GraphQl;

    matches(signals: ContentSignals): boolean {
        return this.hasGraphQlPath(signals.url)
            || signals.requestContentType.toLowerCase().includes(MEDIA_TYPES.ApplicationGraphQl)
            || this.hasGraphQlBody(signals.requestBody);
    }

    private hasGraphQlPath(url: string): boolean {
        const parsed = SafeUrl.parse(url);

        return parsed != null && GRAPHQL_PATH_PATTERN.test(parsed.pathname);
    }

    private hasGraphQlBody(body: string | null): boolean {
        if (body == null) {
            return false;
        }

        const parsed = JsonText.tryParse(body);
        if (parsed.hasErrors) {
            return false;
        }

        const operations = Array.isArray(parsed.value)
            ? parsed.value
            : [parsed.value];

        return operations.length > 0 && operations.every(isGraphQlOperation);
    }
}
