import { InMemoryRuleContext } from "../src/Common/Rules/Context/InMemoryRuleContext";
import type { RequestDraft, ResponseDraft } from "../src/Common/Rules/Drafts/Drafts";
import type { LiveChannel } from "../src/Contracts/Live/LiveChannel";
import { LiveChannelKind } from "../src/Contracts/Live/LiveChannelKind";
import type { LiveMessage } from "../src/Contracts/Live/LiveMessage";
import { LiveMessageDirection } from "../src/Contracts/Live/LiveMessageDirection";
import type { PostMessageRecord } from "../src/Contracts/Live/PostMessageRecord";
import { CriteriaMatches, type Criterion } from "../src/Contracts/Rules/Criterion";
import type { Rule } from "../src/Contracts/Rules/Rule";
import { RuleTypeIds } from "../src/Contracts/Rules/RuleTypeIds";
import { DefaultPanelSettings, DefaultProfile } from "../src/Contracts/Settings/DefaultPanelSettings";
import type { PanelSettings } from "../src/Contracts/Settings/PanelSettings";
import type { RuleProfile } from "../src/Contracts/Settings/RuleProfile";
import { ContentKind } from "../src/Contracts/Timeline/ContentKind";
import type { TimelineEntryDetail } from "../src/Contracts/Timeline/TimelineEntryDetail";
import { TimelineEntryState } from "../src/Contracts/Timeline/TimelineEntryState";
import type { TimelineEntrySummary } from "../src/Contracts/Timeline/TimelineEntrySummary";

export const TestUrls = {
    UsersProfile: "https://api.example.com/api/v1/users/42/profile",
    Orders: "https://api.example.com/api/v1/orders?page=2",
} as const;

export function aCriterion(overrides: Partial<Criterion> = {}): Criterion {
    return {
        field: "url",
        op: "wildcard",
        name: "",
        value: "*/api/v1/users/*",
        negate: false,
        ...overrides,
    };
}

export function aRule(overrides: Partial<Rule> = {}): Rule {
    return {
        id: "rule-1",
        name: "Users mock",
        enabled: true,
        type: RuleTypeIds.MockResponse,
        criteria: {
            match: CriteriaMatches.All,
            items: [aCriterion()],
        },
        action: {
            overrideStatus: true,
            status: 200,
            overrideBody: true,
            contentType: "application/json",
            headers: [],
            body: "{\"id\":42}",
        },
        ...overrides,
    };
}

export function aSettings(overrides: Partial<PanelSettings> = {}): PanelSettings {
    return {
        ...DefaultPanelSettings,
        ...overrides,
    };
}

export function aProfile(overrides: Partial<RuleProfile> = {}): RuleProfile {
    return {
        ...DefaultProfile,
        ...overrides,
    };
}

export function aSettingsWithRules(rules: Rule[], overrides: Partial<PanelSettings> = {}): PanelSettings {
    return aSettings({
        profiles: [
            aProfile({
                rules,
            }),
        ],
        ...overrides,
    });
}

export function aRuleContext(): InMemoryRuleContext {
    return new InMemoryRuleContext();
}

export function aRequestDraft(overrides: Partial<RequestDraft> = {}): RequestDraft {
    return {
        url: TestUrls.UsersProfile,
        method: "GET",
        headers: [
            {
                name: "Accept",
                value: "application/json",
            },
        ],
        body: null,
        resourceType: "Fetch",
        response: null,
        ...overrides,
    };
}

export function aResponseDraft(overrides: Partial<ResponseDraft> = {}): ResponseDraft {
    return {
        status: 200,
        headers: [
            {
                name: "Content-Type",
                value: "application/json",
            },
        ],
        body: "{\"id\":42}",
        errorReason: null,
        ...overrides,
    };
}

export function aSummary(overrides: Partial<TimelineEntrySummary> = {}): TimelineEntrySummary {
    return {
        id: "request-1",
        tabId: 7,
        method: "GET",
        url: TestUrls.UsersProfile,
        host: "api.example.com",
        path: "/api/v1/users/42/profile",
        endpointKey: "GET https://api.example.com/api/v1/users/42/profile",
        resourceType: "Fetch",
        contentKind: ContentKind.Json,
        state: TimelineEntryState.Completed,
        statusCode: 200,
        statusText: "OK",
        mimeType: "application/json",
        startedAt: "2026-11-05T10:00:00.000Z",
        durationInMilliseconds: 120,
        appliedRules: [],
        isAnsweredByRule: false,
        redirectedFromUrl: null,
        errorText: null,
        frame: null,
        ...overrides,
    };
}

export function aDetail(overrides: Partial<TimelineEntryDetail> = {}): TimelineEntryDetail {
    return {
        summary: aSummary(),
        requestHeaders: [
            {
                name: "Accept",
                value: "application/json",
            },
        ],
        requestBody: null,
        responseHeaders: [
            {
                name: "Content-Type",
                value: "application/json",
            },
        ],
        responseBody: "{\"id\":42}",
        responseBodyNote: null,
        changes: [],
        ...overrides,
    };
}

export function aChannel(
    id: string,
    kind: LiveChannelKind = LiveChannelKind.WebSocket,
    isOpen: boolean = true,
    overrides: Partial<LiveChannel> = {}
): LiveChannel {
    return {
        id,
        tabId: 7,
        kind,
        url: "wss://live.example.com/socket",
        isOpen,
        isMine: false,
        openedAt: "2026-11-12T10:00:00.000Z",
        ...overrides,
    };
}

export function aLiveMessage(overrides: Partial<LiveMessage> = {}): LiveMessage {
    return {
        id: "live-1",
        channelId: "ws-1",
        direction: LiveMessageDirection.Received,
        at: "2026-11-12T10:00:01.250Z",
        data: "{\"type\":\"hello\"}",
        size: 16,
        opcode: 1,
        eventName: null,
        eventId: null,
        retry: null,
        ...overrides,
    };
}

export function aPostMessage(overrides: Partial<PostMessageRecord> = {}): PostMessageRecord {
    return {
        id: "live-9",
        tabId: 7,
        at: "2026-11-12T10:00:02.000Z",
        from: "pay.example.com",
        to: "top",
        origin: "https://pay.example.com",
        data: "{\"status\":\"paid\"}",
        size: 17,
        isMine: false,
        ...overrides,
    };
}
