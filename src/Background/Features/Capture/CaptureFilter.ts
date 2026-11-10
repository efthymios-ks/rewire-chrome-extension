import { TextualMime } from "../../../Common/Http/TextualMime";

export enum CaptureDecision {
    Skip = 1,
    Capture = 2,
    CaptureWhenResponseIsData = 3,
}

const ResourceTypeDecisions: Record<string, CaptureDecision> = {
    XHR: CaptureDecision.Capture,
    Fetch: CaptureDecision.Capture,
    Document: CaptureDecision.CaptureWhenResponseIsData,
};

const PageMimeMarker = "html";

export interface ICaptureFilter {
    decide(resourceType: string | undefined): CaptureDecision;
    isDataResponse(mimeType: string): boolean;
}

export class CaptureFilter implements ICaptureFilter {
    decide(resourceType: string | undefined): CaptureDecision {
        return ResourceTypeDecisions[resourceType ?? ""] ?? CaptureDecision.Skip;
    }

    isDataResponse(mimeType: string): boolean {
        return TextualMime.isTextual(mimeType) && !mimeType.toLowerCase().includes(PageMimeMarker);
    }
}
