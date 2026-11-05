import type { Protocol } from "devtools-protocol";
import { vi } from "vitest";
import type { TimelineRecord } from "../../src/Background/Features/Capture/TimelineRecord";
import type { IDebuggerClient } from "../../src/Background/Features/Debugging/IDebuggerClient";
import type { IActiveRules } from "../../src/Background/Features/Rules/ActiveRules";
import type { IRuleHitCounter } from "../../src/Background/Features/Rules/RuleHitCounter";
import type { ISettingsCache } from "../../src/Background/Features/Settings/ISettingsCache";
import type { ILogger } from "../../src/Common/Logging/ILogger";
import { Result } from "../../src/Common/Results/Result";
import { InMemoryRuleContext } from "../../src/Common/Rules/Context/InMemoryRuleContext";
import { RuleEnginePlanner } from "../../src/Common/Rules/Engine/RuleEnginePlanner";
import { PipelineEntries } from "../../src/Common/Rules/Engine/RulePipeline";
import type { Rule } from "../../src/Contracts/Rules/Rule";
import type { PanelSettings } from "../../src/Contracts/Settings/PanelSettings";
import { aSummary, TestUrls } from "../TestData";

export type SendMock = ReturnType<typeof vi.fn<(
    tabId: number,
    command: string,
    params?: unknown
) => Promise<Result<unknown>>>>;

export interface DebuggerClientMock {
    client: IDebuggerClient;
    send: SendMock;
}

export interface HitCounterMock {
    counter: IRuleHitCounter;
    count: ReturnType<typeof vi.fn<(ruleId: string) => void>>;
}

export function createDebuggerClientMock(): DebuggerClientMock {
    const send: SendMock = vi
        .fn<(
            tabId: number,
            command: string,
            params?: unknown
        ) => Promise<Result<unknown>>>()
        .mockResolvedValue(Result.ok({}));
    const client = {
        attach: vi.fn().mockResolvedValue(Result.done()),
        detach: vi.fn().mockResolvedValue(Result.done()),
        send,
    } as unknown as IDebuggerClient;

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

export function createLogger(): ILogger {
    return {
        warn: vi.fn(),
        error: vi.fn(),
    };
}

export function settingsCacheOf(settings: PanelSettings): ISettingsCache {
    return {
        current: () => settings,
    };
}

export function activeRulesOf(rules: Rule[], isEnabled: boolean = true): IActiveRules {
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
                name: "Accept",
                value: "application/json",
            },
        ],
        rawRequestHeaders: null,
        requestContentType: "",
        requestBody: null,
        responseHeaders: [],
        rawResponseHeaders: null,
        responseBody: "{\"name\":\"Ada\"}",
        responseBodyNote: null,
        changes: [],
        startedTimestamp: 100,
        ...overrides,
    };
}

export function aPausedEvent(overrides: Partial<Protocol.Fetch.RequestPausedEvent> = {}): Protocol.Fetch.RequestPausedEvent {
    return {
        requestId: "interception-1",
        networkId: "request-1",
        frameId: "frame-1",
        resourceType: "Fetch",
        request: {
            url: TestUrls.UsersProfile,
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            initialPriority: "High",
            referrerPolicy: "strict-origin-when-cross-origin",
        },
        ...overrides,
    };
}

export function aRequestWillBeSentEvent(overrides: Partial<Protocol.Network.RequestWillBeSentEvent> = {}): Protocol.Network.RequestWillBeSentEvent {
    return {
        requestId: "request-1",
        loaderId: "loader-1",
        documentURL: "https://app.example.com/",
        timestamp: 100,
        wallTime: 1_793_872_800,
        initiator: {
            type: "script",
        },
        redirectHasExtraInfo: false,
        type: "Fetch",
        request: {
            url: TestUrls.UsersProfile,
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            initialPriority: "High",
            referrerPolicy: "strict-origin-when-cross-origin",
        },
        ...overrides,
    };
}
