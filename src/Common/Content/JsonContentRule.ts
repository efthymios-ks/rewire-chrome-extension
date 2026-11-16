import { MEDIA_TYPES } from '../../Contracts/Http/MediaTypes';
import { CONTENT_KIND } from '../../Contracts/Timeline/ContentKind';
import type { ContentSignals } from './ContentSignals';
import type { ContentKindRule } from './ContentKindRule';

export class JsonContentRule implements ContentKindRule {
    readonly kind = CONTENT_KIND.Json;

    matches(signals: ContentSignals): boolean {
        return signals.responseMimeType.toLowerCase().includes(MEDIA_TYPES.JsonMarker)
            || signals.requestContentType.toLowerCase().includes(MEDIA_TYPES.JsonMarker);
    }
}
