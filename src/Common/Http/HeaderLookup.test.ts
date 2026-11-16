import { describe, expect, test } from 'vitest';
import { HeaderLookup } from './HeaderLookup';
import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';

const HEADERS: HeaderEntry[] = [
    {
        name: 'Content-Type',
        value: 'application/json',
    },
    {
        name: 'Set-Cookie',
        value: 'a=1',
    },
    {
        name: 'set-cookie',
        value: 'b=2',
    },
    {
        name: 'X-Empty',
        value: '',
    },
];

describe('HeaderLookup', () => {
    test.each([
        [
            'Content-Type',
            'application/json',
        ],
        [
            'content-type',
            'application/json',
        ],
        [
            'SET-COOKIE',
            'a=1',
        ],
        [
            'x-empty',
            '',
        ],
        [
            'Authorization',
            null,
        ],
        [
            '',
            null,
        ],
    ])('find_WhenNameIs(%s)_ShouldReturn(%s)', (name, expected) => {
        // Act
        const value = HeaderLookup.find(HEADERS, name);

        // Assert
        expect(value).toBe(expected);
    });

    test('find_WhenHeadersAreEmpty_ShouldReturnNull', () => {
        // Act
        const value = HeaderLookup.find([], 'Accept');

        // Assert
        expect(value).toBeNull();
    });

    test('fromRecord_WhenRecordIsUndefined_ShouldReturnNoHeaders', () => {
        // Act
        const headers = HeaderLookup.fromRecord(undefined);

        // Assert
        expect(headers).toEqual([]);
    });

    test('fromRecord_WhenRecordHasEntries_ShouldKeepOrderAndValues', () => {
        // Arrange
        const record = {
            'Content-Type': 'text/plain',
            'X-Multi': 'a\nb',
        };

        // Act
        const headers = HeaderLookup.fromRecord(record);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Content-Type',
                value: 'text/plain',
            },
            {
                name: 'X-Multi',
                value: 'a\nb',
            },
        ]);
    });

    test('fromRawRecord_WhenRecordIsUndefined_ShouldReturnNoHeaders', () => {
        // Act
        const headers = HeaderLookup.fromRawRecord(undefined);

        // Assert
        expect(headers).toEqual([]);
    });

    test('fromRawRecord_WhenValueHoldsSeveralLines_ShouldSplitThemIntoSeparateHeaders', () => {
        // Arrange
        const record = {
            'Set-Cookie': 'a=1\nb=2',
            'Content-Type': 'application/json',
        };

        // Act
        const headers = HeaderLookup.fromRawRecord(record);

        // Assert
        expect(headers).toEqual([
            {
                name: 'Set-Cookie',
                value: 'a=1',
            },
            {
                name: 'Set-Cookie',
                value: 'b=2',
            },
            {
                name: 'Content-Type',
                value: 'application/json',
            },
        ]);
    });

    test('fromRawRecord_WhenValueIsEmpty_ShouldKeepOneEmptyHeader', () => {
        // Arrange
        const record = {
            'X-Empty': '',
        };

        // Act
        const headers = HeaderLookup.fromRawRecord(record);

        // Assert
        expect(headers).toEqual([
            {
                name: 'X-Empty',
                value: '',
            },
        ]);
    });
});
