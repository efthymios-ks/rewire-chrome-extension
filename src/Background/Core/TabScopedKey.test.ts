import { describe, expect, test } from 'vitest';
import { TabScopedKey } from './TabScopedKey';

describe('TabScopedKey', () => {
    test('of_WhenGivenATabAndAnId_ShouldJoinThem', () => {
        // Arrange
        const tabId = 7;

        // Act
        const key = TabScopedKey.of(tabId, 'request-1');

        // Assert
        expect(key).toBe('7:request-1');
    });

    test('isOfTab_WhenTheKeyWasBuiltForTheTab_ShouldBeTrue', () => {
        // Arrange
        const key = TabScopedKey.of(7, 'request-1');

        // Act
        const isOfTab = TabScopedKey.isOfTab(key, 7);

        // Assert
        expect(isOfTab).toBe(true);
    });

    test('isOfTab_WhenAnotherTabIdStartsWithTheSameDigits_ShouldBeFalse', () => {
        // Arrange
        const key = TabScopedKey.of(71, 'request-1');

        // Act
        const isOfTab = TabScopedKey.isOfTab(key, 7);

        // Assert
        expect(isOfTab).toBe(false);
    });
});
