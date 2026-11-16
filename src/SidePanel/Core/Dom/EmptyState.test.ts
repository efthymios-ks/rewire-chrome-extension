import { describe, expect, test } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
    test('build_WhenAMessageIsGiven_ShouldShowIt', () => {
        // Arrange
        const message = 'No requests yet.';

        // Act
        const root = EmptyState.build(message);

        // Assert
        expect(root.className).toBe('empty-state');
        expect(root.querySelector('p')?.textContent).toBe('No requests yet.');
    });
});
