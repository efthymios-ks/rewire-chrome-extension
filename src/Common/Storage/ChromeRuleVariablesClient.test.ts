import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeRuleVariablesClient } from './ChromeRuleVariablesClient';
import type { ProfileVariable } from '../../Contracts/Settings/ProfileVariable';

type ChangeListener = (changes: Record<string, { newValue?: unknown }>, areaName: string) => void;

function stubChrome(stored: unknown): ChangeListener[] {
    const listeners: ChangeListener[] = [];
    vi.stubGlobal('chrome', {
        storage: {
            session: {
                get: vi.fn().mockResolvedValue({
                    ruleVariables: stored,
                }),
            },
            onChanged: {
                addListener: (listener: ChangeListener) => listeners.push(listener),
            },
        },
    });

    return listeners;
}

describe('ChromeRuleVariablesClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('loadAsync_WhenStoredValuesAreMixed_ShouldKeepOnlyNamedTextValues', async () => {
        // Arrange
        stubChrome([
            {
                name: 'token',
                value: 'abc',
            },
            {
                name: 'count',
                value: 3,
            },
            'junk',
        ]);

        // Act
        const loaded = await new ChromeRuleVariablesClient().loadAsync();

        // Assert
        expect(loaded).toEqual({
            hasErrors: false,
            value: [
                {
                    name: 'token',
                    value: 'abc',
                },
            ],
        });
    });

    test('subscribe_WhenSessionVariablesChange_ShouldPassTheNewList', () => {
        // Arrange
        const listeners = stubChrome([]);
        const received: ProfileVariable[][] = [];
        new ChromeRuleVariablesClient().subscribe(variables => received.push(variables));

        // Act
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleVariables: {
                    newValue: [
                        {
                            name: 'userId',
                            value: '42',
                        },
                    ],
                },
            },
            /* areaName: */ 'local',
        ));
        listeners.forEach(listener => listener(
            /* changes: */ {
                ruleVariables: {
                    newValue: [
                        {
                            name: 'userId',
                            value: '43',
                        },
                    ],
                },
            },
            /* areaName: */ 'session',
        ));

        // Assert
        expect(received).toEqual([
            [
                {
                    name: 'userId',
                    value: '43',
                },
            ],
        ]);
    });
});
