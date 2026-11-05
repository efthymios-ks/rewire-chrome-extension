import { MediaTypes } from "../../Contracts/Http/MediaTypes";
import { ContentKind } from "../../Contracts/Timeline/ContentKind";
import type { ContentSignals } from "./ContentSignals";
import type { IContentKindRule } from "./IContentKindRule";

const FormMediaTypes: string[] = [
    MediaTypes.MultipartFormData,
    MediaTypes.FormUrlEncoded,
];

export class FormDataContentRule implements IContentKindRule {
    readonly kind = ContentKind.FormData;

    matches(signals: ContentSignals): boolean {
        const contentType = signals.requestContentType.toLowerCase();

        return FormMediaTypes.some(mediaType => contentType.includes(mediaType));
    }
}
