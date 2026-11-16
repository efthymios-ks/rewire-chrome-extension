import { describe, expect, test } from 'vitest';
import { HeaderText } from './HeaderText';

describe('HeaderText', () => {
    test('parse_WhenLinesHoldNamesAndValues_ShouldSplitAtTheFirstColon', () => {
        // Arrange
        const text = 'Accept: application/json\r\n\nX-Time: 10:30\nno colon here\n: empty';

        // Act
        const headers = HeaderText.parse(text);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'X-Time',
                value: '10:30',
            },
        ]);
    });

    test('parse_WhenTheNameIsAPseudoHeader_ShouldKeepTheLeadingColon', () => {
        // Arrange
        const text = ':authority: api.example.com';

        // Act
        const headers = HeaderText.parse(text);

        // Assert
        expect(headers).toEqual([
            {
                name: ':authority',
                value: 'api.example.com',
            },
        ]);
    });
});
