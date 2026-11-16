import type { Protocol } from 'devtools-protocol';
import { vi } from 'vitest';
import type { BrowserRuleSimulator } from './Features/Capture/BrowserRuleSimulator';
import { DefaultCaptureFilter } from './Features/Capture/DefaultCaptureFilter';
import { DefaultTimelineAdmission } from './Features/Capture/DefaultTimelineAdmission';
import { DefaultTimelineRecordClassifier } from './Features/Capture/DefaultTimelineRecordClassifier';
import { DefaultTimelineRecordFactory } from './Features/Capture/DefaultTimelineRecordFactory';
import { DefaultTimelineStore } from './Features/Capture/DefaultTimelineStore';
import type { TimelineRecord } from './Features/Capture/TimelineRecord';
import type { DebuggerClient } from './Features/Debugging/DebuggerClient';
import { DefaultFrameRegistry } from './Features/Frames/DefaultFrameRegistry';
import type { ActiveRules } from './Features/Rules/ActiveRules';
import type { RuleHitCounter } from './Features/Rules/RuleHitCounter';
import type { SettingsCache } from './Features/Settings/SettingsCache';
import { DefaultContentKindClassifier } from '../Common/Content/DefaultContentKindClassifier';
import { Result } from '../Common/Results/Result';
import { InMemoryRuleContext } from '../Common/Rules/Context/InMemoryRuleContext';
import { PipelineEntries } from '../Common/Rules/Engine/PipelineEntries';
import { RuleEnginePlanner } from '../Common/Rules/Engine/RuleEnginePlanner';
import type { Rule } from '../Contracts/Rules/Rule';
import type { PanelSettings } from '../Contracts/Settings/PanelSettings';
import { aSummary, TEST_URLS } from '../TestData';

const BYTE_VALUES = 256;
const BYTE_STEP = 151;
const BYTE_SEED = 7;

export type SendMock = ReturnType<typeof vi.fn<(
    tabId: number,
    command: string,
    params?: unknown,
) => Promise<Result<unknown>>>>;

export interface DebuggerClientMock {
    client: DebuggerClient;
    send: SendMock;
}

export interface HitCounterMock {
    counter: RuleHitCounter;
    count: ReturnType<typeof vi.fn<(ruleId: string) => void>>;
}

export function createDebuggerClientMock(): DebuggerClientMock {
    const send: SendMock = vi
        .fn<(
            tabId: number,
            command: string,
            params?: unknown,
        ) => Promise<Result<unknown>>>()
        .mockResolvedValue(Result.ok({}));
    const client = {
        attachAsync: vi.fn().mockResolvedValue(Result.done()),
        detachAsync: vi.fn().mockResolvedValue(Result.done()),
        sendAsync: send,
        sendToSessionAsync: vi.fn().mockResolvedValue(Result.ok({})),
    } as unknown as DebuggerClient;

    return {
        client,
        send,
    };
}

export function createHitCounterMock(): HitCounterMock {
    const count = vi.fn<(ruleId: string) => void>();

    return {
        counter: {
            count,
            setOwners: vi.fn(),
            startPolling: vi.fn(),
            stopPolling: vi.fn(),
        },
        count,
    };
}

export function settingsCacheOf(settings: PanelSettings): SettingsCache {
    return {
        current: () => settings,
    };
}

export function activeRulesOf(rules: Rule[], isEnabled: boolean = true): ActiveRules {
    const context = new InMemoryRuleContext();
    const plans = RuleEnginePlanner.planAll(rules, context);

    return {
        isEnabled: () => isEnabled,
        plans: () => plans,
        context: () => context,
        simulationContext: () => new InMemoryRuleContext(),
        debuggerEntries: () => isEnabled ? PipelineEntries.forDebugger(plans) : [],
        browserEntries: () => isEnabled ? PipelineEntries.forBrowser(plans) : [],
        wholeEntries: () => isEnabled ? PipelineEntries.forWholeRules(plans) : [],
        subscribe: vi.fn(),
    };
}

export function aTimelineRecord(overrides: Partial<TimelineRecord> = {}): TimelineRecord {
    return {
        summary: aSummary(),
        requestHeaders: [
            {
                name: 'Accept',
                value: 'application/json',
            },
        ],
        rawRequestHeaders: null,
        requestContentType: '',
        requestBody: null,
        requestBodyNote: null,
        requestBodyBase64: null,
        requestBodyByteSize: null,
        responseHeaders: [],
        rawResponseHeaders: null,
        responseBody: '{"name":"Ada"}',
        responseBodyNote: null,
        changes: [],
        startedTimestamp: 100,
        ...overrides,
    };
}

export function aPausedEvent(
    overrides: Partial<Protocol.Fetch.RequestPausedEvent> = {},
): Protocol.Fetch.RequestPausedEvent {
    return {
        requestId: 'interception-1',
        networkId: 'request-1',
        frameId: 'frame-1',
        resourceType: 'Fetch',
        request: {
            url: TEST_URLS.UsersProfile,
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
            initialPriority: 'High',
            referrerPolicy: 'strict-origin-when-cross-origin',
        },
        ...overrides,
    };
}

export function aRequestWillBeSentEvent(
    overrides: Partial<Protocol.Network.RequestWillBeSentEvent> = {},
): Protocol.Network.RequestWillBeSentEvent {
    return {
        requestId: 'request-1',
        loaderId: 'loader-1',
        documentURL: 'https://app.example.com/',
        timestamp: 100,
        wallTime: 1_793_872_800,
        initiator: {
            type: 'script',
        },
        redirectHasExtraInfo: false,
        type: 'Fetch',
        request: {
            url: TEST_URLS.UsersProfile,
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
            initialPriority: 'High',
            referrerPolicy: 'strict-origin-when-cross-origin',
        },
        ...overrides,
    };
}

export function aResponseReceivedEvent(
    response: Partial<Protocol.Network.Response> = {},
): Protocol.Network.ResponseReceivedEvent {
    const mimeType = response.mimeType ?? 'application/json';

    return {
        requestId: 'request-1',
        loaderId: 'loader-1',
        timestamp: 101,
        type: 'Fetch',
        hasExtraInfo: false,
        response: {
            url: TEST_URLS.UsersProfile,
            status: 200,
            statusText: 'OK',
            headers: {
                'content-type': mimeType,
            },
            mimeType,
            charset: 'utf-8',
            connectionReused: false,
            connectionId: 1,
            encodedDataLength: 100,
            securityState: 'secure',
            ...response,
        },
    };
}

export interface CaptureParts {
    timelineStore: DefaultTimelineStore;
    admission: DefaultTimelineAdmission;
    captureFilter: DefaultCaptureFilter;
    recordClassifier: DefaultTimelineRecordClassifier;
    recordFactory: DefaultTimelineRecordFactory;
    frameRegistry: DefaultFrameRegistry;
    browserRuleSimulator: BrowserRuleSimulator;
}

export function captureParts(): CaptureParts {
    const timelineStore = new DefaultTimelineStore();
    const recordClassifier = new DefaultTimelineRecordClassifier(new DefaultContentKindClassifier());
    const frameRegistry = new DefaultFrameRegistry();
    const browserRuleSimulator: BrowserRuleSimulator = {
        simulateRequest: vi.fn().mockReturnValue(null),
        simulateResponse: vi.fn().mockReturnValue(null),
    };

    return {
        timelineStore,
        admission: new DefaultTimelineAdmission(timelineStore, browserRuleSimulator),
        captureFilter: new DefaultCaptureFilter(),
        recordClassifier,
        recordFactory: new DefaultTimelineRecordFactory(recordClassifier, frameRegistry),
        frameRegistry,
        browserRuleSimulator,
    };
}

export function utf8Of(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

export async function compressAsync(
    content: string | Uint8Array,
    format: CompressionFormat,
): Promise<Uint8Array> {
    const bytes = typeof content === 'string' ? utf8Of(content) : content;
    const compressed = new Blob([new Uint8Array(bytes)])
        .stream()
        .pipeThrough(new CompressionStream(format));

    return new Uint8Array(await new Response(compressed).arrayBuffer());
}

export function binaryBytesOf(length: number): Uint8Array {
    return Uint8Array.from({ length }, (_, index) => (index * BYTE_STEP + BYTE_SEED) % BYTE_VALUES);
}
