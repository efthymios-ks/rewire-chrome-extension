import { MEDIA_TYPE_NAMES } from '../../Contracts/Http/MediaTypeNames';
import { CONTENT_KIND } from '../../Contracts/Timeline/ContentKind';
import type { ContentSignals } from './ContentSignals';
import type { ContentKindRule } from './ContentKindRule';

const FORM_MEDIA_TYPES: string[] = [
    MEDIA_TYPE_NAMES.MultipartFormData,
    MEDIA_TYPE_NAMES.ApplicationFormUrlEncoded,
];

export class FormDataContentRule implements ContentKindRule {
    readonly kind = CONTENT_KIND.FormData;

    matches(signals: ContentSignals): boolean {
        const contentType = signals.requestContentType.toLowerCase();

        return FORM_MEDIA_TYPES.some(mediaType => contentType.includes(mediaType));
    }
}
