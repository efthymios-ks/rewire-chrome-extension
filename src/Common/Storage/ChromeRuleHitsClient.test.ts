import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeRuleHitsClient } from './ChromeRuleHitsClient';
import type { RuleHit } from '../../Contracts/Rules/RuleHit';

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

function aHit(overrides: Partial<RuleHit> = {}): RuleHit {
    return {
        ruleId: 'rule-1',
        count: 3,
        ...overrides,
    };
}

describe('ChromeRuleHitsClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('loadAsync_WhenStoredValuesAreMixed_ShouldKeepOnlyWellFormedHits', async () => {
        // Arrange
        const hit = aHit();
        stubChrome({
            get: vi.fn().mockResolvedValue({
                ruleHits: [
                    hit,
                    {
                        ruleId: 'rule-2',
                        count: '3',
                    },
                    {
                        ruleId: 7,
                        count: 1,
                    },
                    null,
                    'junk',
                ],
            }),
        });

        // Act
        const loaded = await new ChromeRuleHitsClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: false,
            value: [hit],
        });
    });

    test.each([
        undefined,
        null,
        'junk',
        {
            ruleId: 'rule-1',
            count: 1,
        },
    ])('loadAsync_WhenStoredValueIs(%s)_ShouldReturnNoHits', async stored => {
        // Arrange
        stubChrome({
            get: vi.fn().mockResolvedValue({
                ruleHits: stored,
            }),
        });

        // Act
        const loaded = await new ChromeRuleHitsClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test('loadAsync_WhenStorageThrows_ShouldFailWithTheReason', async () => {
        // Arrange
        stubChrome({
            get: vi.fn().mockRejectedValue(new Error('Access denied')),
        });

        // Act
        const loaded = await new ChromeRuleHitsClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: true,
            error: 'Loading rule hit counts failed: Access denied',
        });
    });

    test('saveAsync_WhenStorageAccepts_ShouldWriteTheHitsUnderTheirKey', async () => {
        // Arrange
        const set = vi.fn().mockResolvedValue(undefined);
        stubChrome({
            set,
        });
        const hits = [aHit()];

        // Act
        const saved = await new ChromeRuleHitsClient().saveAsync(hits);

        // Assert
        expect(saved).toEqual({
            hasErrors: false,
            value: undefined,
        });
        expect(set).toHaveBeenCalledWith({
            ruleHits: hits,
        });
    });

    test('saveAsync_WhenStorageThrows_ShouldFailWithTheReason', async () => {
        // Arrange
        stubChrome({
            set: vi.fn().mockRejectedValue('quota'),
        });

        // Act
        const saved = await new ChromeRuleHitsClient().saveAsync([aHit()]);

        // Assert
        expect(saved).toEqual({
            hasErrors: true,
            error: 'Saving rule hit counts failed: quota',
        });
    });

    test('subscribe_WhenSessionHitsChange_ShouldPassOnlyThoseChanges', () => {
        // Arrange
        const listeners = stubChrome({});
        const received: RuleHit[][] = [];
        new ChromeRuleHitsClient().subscribe(hits => received.push(hits));
        const hit = aHit({
            count: 9,
        });

        // Act
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleHits: {
                    newValue: [hit],
                },
            },
            /* areaName: */ 'local',
        ));
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleVariables: {
                    newValue: [],
                },
            },
            /* areaName: */ 'session',
        ));
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleHits: {
                    newValue: [
                        hit,
                        'junk',
                    ],
                },
            },
            /* areaName: */ 'session',
        ));

        // Assert
        expect(received).toEqual([[hit]]);
    });

    test('subscribe_WhenHitsAreRemoved_ShouldPassNoHits', () => {
        // Arrange
        const listeners = stubChrome({});
        const received: RuleHit[][] = [];
        new ChromeRuleHitsClient().subscribe(hits => received.push(hits));

        // Act
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleHits: {},
            },
            /* areaName: */ 'session',
        ));

        // Assert
        expect(received).toEqual([[]]);
    });
});
