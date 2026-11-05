import { TextualMime } from "../../../Common/Http/TextualMime";
import { DomainMatcher } from "../../../Common/Urls/DomainMatcher";
import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import type { ISettingsCache } from "../Settings/ISettingsCache";

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
    decide(url: string, resourceType: string | undefined): CaptureDecision;
    isDataResponse(mimeType: string): boolean;
}

export class CaptureFilter implements ICaptureFilter {
    private readonly _settingsCache: ISettingsCache;

    constructor(settingsCache: ISettingsCache) {
        this._settingsCache = settingsCache;
    }

    decide(url: string, resourceType: string | undefined): CaptureDecision {
        const decision = ResourceTypeDecisions[resourceType ?? ""] ?? CaptureDecision.Skip;
        if (decision === CaptureDecision.Skip || !this.isAllowedDomain(url)) {
            return CaptureDecision.Skip;
        }

        return decision;
    }

    isDataResponse(mimeType: string): boolean {
        return TextualMime.isTextual(mimeType) && !mimeType.toLowerCase().includes(PageMimeMarker);
    }

    private isAllowedDomain(url: string): boolean {
        const whitelist = this._settingsCache.current().domainWhitelist;
        if (whitelist.length === 0) {
            return true;
        }

        const parsed = SafeUrl.parse(url);

        return parsed !== null && DomainMatcher.matchesAny(parsed.hostname, whitelist);
    }
}
