import { describe, expect, test, vi } from 'vitest';
import type { VariableStore } from './VariableStore';
import { WorkerRuleContext } from './WorkerRuleContext';

function storeOf(values: Record<string, string>): VariableStore {
    return {
        get: name => values[name] ?? null,
        set: vi.fn(),
        snapshot: () => new Map(Object.entries(values)),
        subscribe: vi.fn(),
    };
}

const TYPED: Record<string, string> = {
    token: 'typed-token',
    baseUrl: 'http://localhost:5000',
};

function profileLookup(name: string): string | null {
    return TYPED[name] ?? null;
}

describe('WorkerRuleContext', () => {
    test('variable_WhenARuleCapturedTheName_ShouldWinOverTheProfileValue', () => {
        // Arrange
        const context = new WorkerRuleContext(
            /* variables: */ storeOf({
                token: 'captured-token',
            }),
            /* profileVariable: */ profileLookup,
        );

        // Act
        const rendered = context.render('{{token}} at {{baseUrl}}');

        // Assert
        expect(rendered).toBe('captured-token at http://localhost:5000');
    });

    test('variable_WhenNeitherHasTheName_ShouldReturnNull', () => {
        // Arrange
        const context = new WorkerRuleContext(
            /* variables: */ storeOf({}),
            /* profileVariable: */ profileLookup,
        );

        // Act
        const value = context.variable('missing');

        // Assert
        expect(value).toBeNull();
    });

    test('setVariable_WhenCalled_ShouldWriteToTheCapturedStore', () => {
        // Arrange
        const store = storeOf({});
        const context = new WorkerRuleContext(store, profileLookup);

        // Act
        context.setVariable('userId', '42');

        // Assert
        expect(store.set).toHaveBeenCalledWith('userId', '42');
    });
});
