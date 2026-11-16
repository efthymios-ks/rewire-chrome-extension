import { describe, expect, test } from 'vitest';
import { RawRecords } from './RawRecords';

describe('RawRecords', () => {
    test.each([
        [
            {},
            true,
        ],
        [
            [],
            false,
        ],
        [
            null,
            false,
        ],
        [
            'text',
            false,
        ],
    ])('is_WhenTheValueIs(%s)_ShouldReturn(%s)', (value, expected) => {
        // Act
        const isRecord = RawRecords.is(value);

        // Assert
        expect(isRecord).toBe(expected);
    });

    test('text_WhenTheValueIsNotAString_ShouldReturnEmpty', () => {
        // Arrange
        const record = {
            name: 'Ada',
            count: 3,
        };

        // Act
        const texts = [
            RawRecords.text(record, 'name'),
            RawRecords.text(record, 'count'),
            RawRecords.text(record, 'missing'),
        ];

        // Assert
        expect(texts).toEqual([
            'Ada',
            '',
            '',
        ]);
    });

    test('records_WhenTheArrayMixesValues_ShouldKeepOnlyObjects', () => {
        // Arrange
        const record = {
            items: [
                {
                    id: 1,
                },
                'text',
                null,
                [],
                {
                    id: 2,
                },
            ],
        };

        // Act
        const records = RawRecords.records(record, 'items');

        // Assert
        expect(records).toEqual([
            {
                id: 1,
            },
            {
                id: 2,
            },
        ]);
    });

    test('records_WhenTheKeyIsNotAnArray_ShouldReturnEmpty', () => {
        // Arrange
        const record = {
            items: 'none',
        };

        // Act
        const records = RawRecords.records(record, 'items');

        // Assert
        expect(records).toEqual([]);
    });
});
