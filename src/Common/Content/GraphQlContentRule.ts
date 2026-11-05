import { MediaTypes } from "../../Contracts/Http/MediaTypes";
import { ContentKind } from "../../Contracts/Timeline/ContentKind";
import { JsonText } from "../Json/JsonText";
import { SafeUrl } from "../Urls/SafeUrl";
import type { ContentSignals } from "./ContentSignals";
import type { IContentKindRule } from "./IContentKindRule";

const GraphQlPathPattern = /\/graphql(?:\/|$)/i;
const QueryPropertyName = "query";

function isGraphQlOperation(value: unknown): boolean {
    return typeof value === "object"
        && value !== null
        && typeof (value as Record<string, unknown>)[QueryPropertyName] === "string";
}

export class GraphQlContentRule implements IContentKindRule {
    readonly kind = ContentKind.GraphQl;

    matches(signals: ContentSignals): boolean {
        return this.hasGraphQlPath(signals.url)
            || signals.requestContentType.toLowerCase().includes(MediaTypes.ApplicationGraphQl)
            || this.hasGraphQlBody(signals.requestBody);
    }

    private hasGraphQlPath(url: string): boolean {
        const parsed = SafeUrl.parse(url);

        return parsed !== null && GraphQlPathPattern.test(parsed.pathname);
    }

    private hasGraphQlBody(body: string | null): boolean {
        if (body === null) {
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
