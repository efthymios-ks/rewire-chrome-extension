import { describe, expect, test } from 'vitest';
import { BoundedMap } from './BoundedMap';

describe('BoundedMap', () => {
    test('set_WhenWithinTheLimit_ShouldKeepEveryEntry', () => {
        // Arrange
        const map = new BoundedMap<string, number>(3);

        // Act
        map
            .set('first', 1)
            .set('second', 2)
            .set('third', 3);

        // Assert
        expect([...map.entries()]).toEqual([
            ['first', 1],
            ['second', 2],
            ['third', 3],
        ]);
    });

    test('set_WhenOverTheLimit_ShouldDropTheOldestEntries', () => {
        // Arrange
        const map = new BoundedMap<string, number>(2);

        // Act
        map
            .set('first', 1)
            .set('second', 2)
            .set('third', 3)
            .set('fourth', 4);

        // Assert
        expect([...map.keys()]).toEqual([
            'third',
            'fourth',
        ]);
    });

    test('set_WhenTheKeyAlreadyExists_ShouldReplaceTheValueInPlace', () => {
        // Arrange
        const map = new BoundedMap<string, number>(2);
        map
            .set('first', 1)
            .set('second', 2);

        // Act
        map.set('first', 10);

        // Assert
        expect([...map.entries()]).toEqual([
            ['first', 10],
            ['second', 2],
        ]);
    });

    test('set_WhenTheKeyIsZero_ShouldStillDropIt', () => {
        // Arrange
        const map = new BoundedMap<number, string>(1);
        map.set(0, 'zero');

        // Act
        map.set(1, 'one');

        // Assert
        expect([...map.keys()]).toEqual([1]);
    });
});
