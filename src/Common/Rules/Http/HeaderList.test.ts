import { describe, expect, test } from 'vitest';
import { HeaderList } from './HeaderList';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';

function sampleHeaders(): HeaderEntry[] {
    return [
        {
            name: 'Accept',
            value: 'application/json',
        },
        {
            name: 'X-Trace',
            value: 'a',
        },
        {
            name: 'x-trace',
            value: 'b',
        },
    ];
}

describe('HeaderList', () => {
    test('values_WhenNameDiffersInCase_ShouldReturnEveryMatchInOrder', () => {
        // Arrange
        const headers = sampleHeaders();

        // Act
        const values = HeaderList.values(headers, 'X-TRACE');

        // Assert
        expect(values).toEqual([
            'a',
            'b',
        ]);
    });

    test('set_WhenHeaderRepeats_ShouldReplaceEveryCopyWithOneAtTheEnd', () => {
        // Arrange
        const headers = sampleHeaders();

        // Act
        const updated = HeaderList.set({ headers, name: 'X-Trace', value: 'c' });

        // Assert
        expect(updated).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'X-Trace',
                value: 'c',
            },
        ]);
        expect(headers).toEqual(sampleHeaders());
    });

    test('append_WhenHeaderExists_ShouldKeepItAndAddAnother', () => {
        // Arrange
        const headers = sampleHeaders();

        // Act
        const updated = HeaderList.append({ headers, name: 'Accept', value: 'text/plain' });

        // Assert
        expect(HeaderList.values(updated, 'accept')).toEqual([
            'application/json',
            'text/plain',
        ]);
        expect(headers).toHaveLength(3);
    });

    test('remove_WhenNameDiffersInCase_ShouldDropEveryCopy', () => {
        // Arrange
        const headers = sampleHeaders();

        // Act
        const updated = HeaderList.remove(headers, 'X-TRACE');

        // Assert
        expect(updated).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
        ]);
    });
});
