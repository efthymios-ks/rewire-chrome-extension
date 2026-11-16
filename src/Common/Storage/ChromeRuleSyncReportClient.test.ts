import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeRuleSyncReportClient } from './ChromeRuleSyncReportClient';
import type { RuleSyncReport } from '../../Contracts/RuleSync/RuleSyncReport';

type ChangeListener = (changes: Record<string, { newValue?: unknown }>, areaName: string) => void;

interface StubChromeOptions {
    get?: () => Promise<unknown>;
    set?: (items: unknown) => Promise<void>;
}

function stubChrome({
    get = vi.fn().mockResolvedValue({}),
    set = vi.fn().mockResolvedValue(undefined),
}: StubChromeOptions): ChangeListener[] {
    const listeners: ChangeListener[] = [];
    vi.stubGlobal('chrome', {
        storage: {
            session: {
                get,
                set,
            },
            onChanged: {
                addListener: (listener: ChangeListener) => listeners.push(listener),
            },
        },
    });

    return listeners;
}

function aReport(overrides: Partial<RuleSyncReport> = {}): RuleSyncReport {
    return {
        syncedAt: '2026-11-16T10:00:00.000Z',
        activeRuleCount: 2,
        failures: [
            {
                sourceName: 'Users mock',
                ruleId: 'rule-1',
                message: 'Regex is not supported.',
            },
        ],
        ...overrides,
    };
}

function aStoredReport(): unknown {
    return {
        syncedAt: '2026-11-16T10:00:00.000Z',
        activeRuleCount: 2,
        failures: [
            {
                sourceName: 'Users mock',
                settingId: 'rule-1',
                message: 'Regex is not supported.',
            },
        ],
    };
}

describe('ChromeRuleSyncReportClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('loadAsync_WhenAReportIsStored_ShouldReturnItWithEachFailuresRuleId', async () => {
        // Arrange
        stubChrome({
            get: vi.fn().mockResolvedValue({
                ruleSyncReport: aStoredReport(),
            }),
        });

        // Act
        const loaded = await new ChromeRuleSyncReportClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: false,
            value: aReport(),
        });
    });

    test.each([
        undefined,
        null,
        'junk',
        42,
    ])('loadAsync_WhenStoredValueIs(%s)_ShouldReturnNoReport', async stored => {
        // Arrange
        stubChrome({
            get: vi.fn().mockResolvedValue({
                ruleSyncReport: stored,
            }),
        });

        // Act
        const loaded = await new ChromeRuleSyncReportClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: false,
            value: null,
        });
    });

    test('loadAsync_WhenStorageThrows_ShouldFailWithTheReason', async () => {
        // Arrange
        stubChrome({
            get: vi.fn().mockRejectedValue(new Error('Access denied')),
        });

        // Act
        const loaded = await new ChromeRuleSyncReportClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: true,
            error: 'Loading the rule sync report failed: Access denied',
        });
    });

    test('saveAsync_WhenStorageAccepts_ShouldWriteTheStoredShapeUnderItsKey', async () => {
        // Arrange
        const set = vi.fn().mockResolvedValue(undefined);
        stubChrome({
            set,
        });

        // Act
        const saved = await new ChromeRuleSyncReportClient().saveAsync(aReport());

        // Assert
        expect(saved).toEqual({
            hasErrors: false,
            value: undefined,
        });
        expect(set).toHaveBeenCalledWith({
            ruleSyncReport: aStoredReport(),
        });
    });

    test('saveAsync_WhenStorageThrows_ShouldFailWithTheReason', async () => {
        // Arrange
        stubChrome({
            set: vi.fn().mockRejectedValue(new Error('Quota exceeded')),
        });

        // Act
        const saved = await new ChromeRuleSyncReportClient().saveAsync(aReport());

        // Assert
        expect(saved).toEqual({
            hasErrors: true,
            error: 'Saving the rule sync report failed: Quota exceeded',
        });
    });

    test('subscribe_WhenTheSessionReportChanges_ShouldPassOnlyThoseChanges', () => {
        // Arrange
        const listeners = stubChrome({});
        const received: Array<RuleSyncReport | null> = [];
        new ChromeRuleSyncReportClient().subscribe(report => received.push(report));
        const report = aReport({
            failures: [],
        });

        // Act
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleSyncReport: {
                    newValue: report,
                },
            },
            /* areaName: */ 'local',
        ));
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleHits: {
                    newValue: [],
                },
            },
            /* areaName: */ 'session',
        ));
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleSyncReport: {
                    newValue: report,
                },
            },
            /* areaName: */ 'session',
        ));
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleSyncReport: {},
            },
            /* areaName: */ 'session',
        ));

        // Assert
        expect(received).toEqual([
            report,
            null,
        ]);
    });
});
