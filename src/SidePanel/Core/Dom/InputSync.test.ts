import { describe, expect, test } from 'vitest';
import { InputSync } from './InputSync';

describe('InputSync', () => {
    test('setChecked_WhenTheStateDiffers_ShouldUpdateIt', () => {
        // Arrange
        const input = document.createElement('input');
        input.type = 'checkbox';

        // Act
        InputSync.setChecked(input, true);

        // Assert
        expect(input.checked).toBe(true);
    });

    test('setChecked_WhenTheStateMatches_ShouldKeepIt', () => {
        // Arrange
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = true;

        // Act
        InputSync.setChecked(input, true);

        // Assert
        expect(input.checked).toBe(true);
    });
});
