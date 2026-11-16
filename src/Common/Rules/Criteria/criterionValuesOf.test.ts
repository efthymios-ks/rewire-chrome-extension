import { describe, expect, test } from 'vitest';
import { criterionValuesOf } from './criterionValuesOf';

describe('criterionValuesOf', () => {
    test.each([
        [
            'GET, post',
            ['get', 'post'],
        ],
        [
            ' Fetch\nXHR,,script ',
            ['fetch', 'xhr', 'script'],
        ],
        [
            '',
            [],
        ],
        [
            ' , ',
            [],
        ],
    ])('criterionValuesOf_WhenTheTextIs(%j)_ShouldReturn(%j)', (text, expected) => {
        // Act
        const values = criterionValuesOf(text);

        // Assert
        expect(values).toEqual(expected);
    });
});
