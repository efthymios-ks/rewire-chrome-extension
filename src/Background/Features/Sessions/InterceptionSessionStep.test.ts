import { describe, expect, test, vi } from 'vitest';
import { InterceptionSessionStep } from './InterceptionSessionStep';
import { aRule } from '../../../TestData';
import { activeRulesOf, createDebuggerClientMock } from '../../BackgroundTestData';

describe('InterceptionSessionStep', () => {
    test('applyAsync_WhenNoRuleNeedsTheDebugger_ShouldTurnInterceptionOffInThatSession', async () => {
        // Arrange
        const debuggerMock = createDebuggerClientMock();
        const step = new InterceptionSessionStep(
            /* debuggerClient: */ debuggerMock.client,
            /* activeRules: */ activeRulesOf([]),
        );

        // Act
        await step.applyAsync(1, 'session-a');

        // Assert
        expect(debuggerMock.client.sendToSessionAsync).toHaveBeenCalledWith(
            /* tabId: */ 1,
            /* sessionId: */ 'session-a',
            /* command: */ 'Fetch.disable',
        );
    });

    test('applyAsync_WhenARuleNeedsTheDebugger_ShouldTurnInterceptionOnInThatSession', async () => {
        // Arrange
        const debuggerMock = createDebuggerClientMock();
        const step = new InterceptionSessionStep(
            /* debuggerClient: */ debuggerMock.client,
            /* activeRules: */ activeRulesOf([aRule()]),
        );

        // Act
        await step.applyAsync(1, null);

        // Assert
        const [call] = vi.mocked(debuggerMock.client.sendToSessionAsync).mock.calls;
        expect(call?.slice(0, 3)).toEqual([
            1,
            null,
            'Fetch.enable',
        ]);
    });
});
