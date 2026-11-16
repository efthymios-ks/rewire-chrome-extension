import { describe, expect, test } from 'vitest';
import { InMemoryRuleContext } from './InMemoryRuleContext';
import { aRuleContext } from '../../../TestData';

describe('InMemoryRuleContext', () => {
    test('variable_WhenNameIsMissing_ShouldReturnNull', () => {
        // Arrange
        const context = aRuleContext();

        // Act
        const value = context.variable('token');

        // Assert
        expect(value).toBeNull();
    });

    test('setVariable_WhenNameExists_ShouldOverwriteIt', () => {
        // Arrange
        const context = aRuleContext();
        context.setVariable('token', 'old');

        // Act
        context.setVariable('token', 'new');

        // Assert
        expect(context.variable('token')).toBe('new');
    });

    test('constructor_WhenVariablesAreGiven_ShouldServeThem', () => {
        // Arrange
        const variables = new Map([
            [
                'tenant',
                'acme',
            ],
        ]);

        // Act
        const context = new InMemoryRuleContext(variables);

        // Assert
        expect(context.variable('tenant')).toBe('acme');
        expect(context.render('/{{tenant}}/users')).toBe('/acme/users');
    });
});
