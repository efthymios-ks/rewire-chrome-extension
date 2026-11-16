import { describe, expect, test } from 'vitest';
import { mergeBy } from './mergeBy';

interface Item {
    id: string;
    value: number;
}

const CURRENT: Item[] = [
    {
        id: 'a',
        value: 1,
    },
    {
        id: 'b',
        value: 2,
    },
];

describe('mergeBy', () => {
    test('mergeBy_WhenKeysOverlap_ShouldTakeTheIncomingItemInPlaceAndAppendNewOnes', () => {
        // Arrange
        const incoming: Item[] = [
            {
                id: 'c',
                value: 30,
            },
            {
                id: 'a',
                value: 10,
            },
        ];

        // Act
        const merged = mergeBy({
            current: CURRENT,
            incoming,
            keyOf: item => item.id,
        });

        // Assert
        expect(merged).toEqual([
            {
                id: 'a',
                value: 10,
            },
            {
                id: 'b',
                value: 2,
            },
            {
                id: 'c',
                value: 30,
            },
        ]);
    });

    test('mergeBy_WhenACombineIsGiven_ShouldUseItForOverlappingKeys', () => {
        // Arrange
        const incoming: Item[] = [
            {
                id: 'b',
                value: 5,
            },
        ];

        // Act
        const merged = mergeBy({
            current: CURRENT,
            incoming,
            keyOf: item => item.id,
            combine: (current, match) => ({
                id: current.id,
                value: current.value + match.value,
            }),
        });

        // Assert
        expect(merged.map(item => item.value)).toEqual([1, 7]);
    });

    test('mergeBy_WhenNothingOverlaps_ShouldKeepTheCurrentItemsUntouched', () => {
        // Act
        const merged = mergeBy({
            current: CURRENT,
            incoming: [],
            keyOf: item => item.id,
        });

        // Assert
        expect(merged).toEqual(CURRENT);
        expect(merged[0]).toBe(CURRENT[0]);
    });
});
