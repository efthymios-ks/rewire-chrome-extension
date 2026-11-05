import { MediaTypes } from "../../Contracts/Http/MediaTypes";
import { ContentKind } from "../../Contracts/Timeline/ContentKind";
import type { ContentSignals } from "./ContentSignals";
import type { IContentKindRule } from "./IContentKindRule";

export class JsonContentRule implements IContentKindRule {
    readonly kind = ContentKind.Json;

    matches(signals: ContentSignals): boolean {
        return signals.responseMimeType.toLowerCase().includes(MediaTypes.JsonMarker)
            || signals.requestContentType.toLowerCase().includes(MediaTypes.JsonMarker);
    }
}
