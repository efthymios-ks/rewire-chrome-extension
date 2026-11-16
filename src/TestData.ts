import { vi } from 'vitest';
import type { Logger } from './Common/Logging/Logger';
import { InMemoryRuleContext } from './Common/Rules/Context/InMemoryRuleContext';
import type { RequestDraft } from './Common/Rules/Drafts/RequestDraft';
import type { ResponseDraft } from './Common/Rules/Drafts/ResponseDraft';
import type { LiveChannel } from './Contracts/Live/LiveChannel';
import { LIVE_CHANNEL_KIND, type LiveChannelKind } from './Contracts/Live/LiveChannelKind';
import type { LiveMessage } from './Contracts/Live/LiveMessage';
import { LIVE_MESSAGE_DIRECTION } from './Contracts/Live/LiveMessageDirection';
import type { PostMessageRecord } from './Contracts/Live/PostMessageRecord';
import { CRITERIA_MATCHES } from './Contracts/Rules/CriteriaMatches';
import type { Criterion } from './Contracts/Rules/Criterion';
import type { Rule } from './Contracts/Rules/Rule';
import type { RuleCriteria } from './Contracts/Rules/RuleCriteria';
import { RULE_TYPE_IDS } from './Contracts/Rules/RuleTypeId';
import { DEFAULT_PANEL_SETTINGS } from './Contracts/Settings/DefaultPanelSettings';
import { DEFAULT_PROFILE } from './Contracts/Settings/DefaultProfile';
import type { PanelSettings } from './Contracts/Settings/PanelSettings';
import type { RuleProfile } from './Contracts/Settings/RuleProfile';
import { CONTENT_KIND } from './Contracts/Timeline/ContentKind';
import type { TimelineEntryDetail } from './Contracts/Timeline/TimelineEntryDetail';
import { TIMELINE_ENTRY_STATE } from './Contracts/Timeline/TimelineEntryState';
import type { TimelineEntrySummary } from './Contracts/Timeline/TimelineEntrySummary';

export const TEST_URLS = Object.freeze({
    UsersProfile: 'https://api.example.com/api/v1/users/42/profile',
    Orders: 'https://api.example.com/api/v1/orders?page=2',
} as const);

export function aCriterion(overrides: Partial<Criterion> = {}): Criterion {
    return {
        field: 'url',
        op: 'wildcard',
        name: '',
        value: '*/api/v1/users/*',
        negate: false,
        ...overrides,
    };
}

export function criteriaOf(...items: Criterion[]): RuleCriteria {
    return {
        match: CRITERIA_MATCHES.All,
        items,
    };
}

export function aRule(overrides: Partial<Rule> = {}): Rule {
    return {
        id: 'rule-1',
        name: 'Users mock',
        enabled: true,
        type: RULE_TYPE_IDS.MockResponse,
        criteria: {
            match: CRITERIA_MATCHES.All,
            items: [aCriterion()],
        },
        action: {
            overrideStatus: true,
            status: 200,
            overrideBody: true,
            contentType: 'application/json',
            headers: [],
            body: '{"id":42}',
        },
        ...overrides,
    };
}

export function aSettings(overrides: Partial<PanelSettings> = {}): PanelSettings {
    return {
        ...DEFAULT_PANEL_SETTINGS,
        ...overrides,
    };
}

export function aProfile(overrides: Partial<RuleProfile> = {}): RuleProfile {
    return {
        ...DEFAULT_PROFILE,
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

export function createLogger(): Logger {
    return {
        warn: vi.fn(),
        error: vi.fn(),
    };
}

export function nextTaskAsync(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
}

export function aRequestDraft(overrides: Partial<RequestDraft> = {}): RequestDraft {
    return {
        url: TEST_URLS.UsersProfile,
        method: 'GET',
        headers: [
            {
                name: 'Accept',
                value: 'application/json',
            },
        ],
        body: null,
        resourceType: 'Fetch',
        response: null,
        ...overrides,
    };
}

export function aResponseDraft(overrides: Partial<ResponseDraft> = {}): ResponseDraft {
    return {
        status: 200,
        headers: [
            {
                name: 'Content-Type',
                value: 'application/json',
            },
        ],
        body: '{"id":42}',
        errorReason: null,
        ...overrides,
    };
}

export function aSummary(overrides: Partial<TimelineEntrySummary> = {}): TimelineEntrySummary {
    return {
        id: 'request-1',
        tabId: 7,
        method: 'GET',
        url: TEST_URLS.UsersProfile,
        host: 'api.example.com',
        path: '/api/v1/users/42/profile',
        endpointKey: 'GET https://api.example.com/api/v1/users/42/profile',
        resourceType: 'Fetch',
        contentKind: CONTENT_KIND.Json,
        state: TIMELINE_ENTRY_STATE.Completed,
        statusCode: 200,
        statusText: 'OK',
        mimeType: 'application/json',
        startedAt: '2026-11-05T10:00:00.000Z',
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
                name: 'Accept',
                value: 'application/json',
            },
        ],
        requestBody: null,
        requestBodyNote: null,
        requestBodyBase64: null,
        requestBodyByteSize: null,
        responseHeaders: [
            {
                name: 'Content-Type',
                value: 'application/json',
            },
        ],
        responseBody: '{"id":42}',
        responseBodyNote: null,
        changes: [],
        ...overrides,
    };
}

export interface AChannelOptions {
    id: string;
    kind?: LiveChannelKind;
    isOpen?: boolean;
    overrides?: Partial<LiveChannel>;
}

export function aChannel({
    id,
    kind = LIVE_CHANNEL_KIND.WebSocket,
    isOpen = true,
    overrides = {},
}: AChannelOptions): LiveChannel {
    return {
        id,
        tabId: 7,
        kind,
        url: 'wss://live.example.com/socket',
        isOpen,
        isMine: false,
        openedAt: '2026-11-12T10:00:00.000Z',
        ...overrides,
    };
}

export function aLiveMessage(overrides: Partial<LiveMessage> = {}): LiveMessage {
    return {
        id: 'live-1',
        channelId: 'ws-1',
        direction: LIVE_MESSAGE_DIRECTION.Received,
        at: '2026-11-12T10:00:01.250Z',
        data: '{"type":"hello"}',
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
        id: 'live-9',
        tabId: 7,
        at: '2026-11-12T10:00:02.000Z',
        from: 'pay.example.com',
        to: 'top',
        origin: 'https://pay.example.com',
        data: '{"status":"paid"}',
        size: 17,
        isMine: false,
        ...overrides,
    };
}
