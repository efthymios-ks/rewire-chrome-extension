import { describe, expect, test } from 'vitest';
import { ActionReader } from './ActionReader';
import type { RuleAction } from '../../../Contracts/Rules/RuleAction';

const ACTION: RuleAction = {
    text: 'hello',
    emptyText: '',
    unicode: 'héllo 👋',
    count: 42,
    zero: 0,
    negative: -5,
    fraction: 1.5,
    notANumber: Number.NaN,
    infinite: Number.POSITIVE_INFINITY,
    numericText: '42',
    isOn: true,
    isOff: false,
    nothing: null,
    list: [
        'a',
        1,
        'b',
        null,
        '',
    ],
    records: [
        {
            name: 'x',
        },
        null,
        'junk',
        [
            'nested',
        ],
        {
            name: 'y',
        },
    ],
    object: {
        name: 'z',
    },
};

describe('ActionReader', () => {
    test.each([
        [
            'text',
            'hello',
        ],
        [
            'emptyText',
            '',
        ],
        [
            'unicode',
            'héllo 👋',
        ],
        [
            'count',
            'fallback',
        ],
        [
            'nothing',
            'fallback',
        ],
        [
            'list',
            'fallback',
        ],
        [
            'missing',
            'fallback',
        ],
    ])('text_WhenKeyIs(%s)_ShouldReturn(%s)', (key, expected) => {
        // Act
        const value = ActionReader.text({
            raw: ACTION,
            key,
            fallback: 'fallback',
        });

        // Assert
        expect(value).toBe(expected);
    });

    test('text_WhenFallbackIsOmitted_ShouldDefaultToEmpty', () => {
        // Act
        const value = ActionReader.text({
            raw: ACTION,
            key: 'count',
        });

        // Assert
        expect(value).toBe('');
    });

    test.each([
        [
            'count',
            42,
        ],
        [
            'zero',
            0,
        ],
        [
            'negative',
            -5,
        ],
        [
            'fraction',
            1.5,
        ],
        [
            'notANumber',
            7,
        ],
        [
            'infinite',
            7,
        ],
        [
            'numericText',
            7,
        ],
        [
            'nothing',
            7,
        ],
        [
            'missing',
            7,
        ],
    ])('number_WhenKeyIs(%s)_ShouldReturn(%s)', (key, expected) => {
        // Act
        const value = ActionReader.number({
            raw: ACTION,
            key,
            fallback: 7,
        });

        // Assert
        expect(value).toBe(expected);
    });

    test.each([
        [
            'count',
            42,
        ],
        [
            'zero',
            0,
        ],
        [
            'notANumber',
            null,
        ],
        [
            'infinite',
            null,
        ],
        [
            'numericText',
            null,
        ],
        [
            'missing',
            null,
        ],
    ])('nullableNumber_WhenKeyIs(%s)_ShouldReturn(%s)', (key, expected) => {
        // Act
        const value = ActionReader.nullableNumber(ACTION, key);

        // Assert
        expect(value).toBe(expected);
    });

    test.each([
        [
            'isOn',
            false,
            true,
        ],
        [
            'isOff',
            true,
            false,
        ],
        [
            'text',
            true,
            true,
        ],
        [
            'zero',
            true,
            true,
        ],
        [
            'nothing',
            false,
            false,
        ],
        [
            'missing',
            true,
            true,
        ],
    ])('bool_WhenKeyIs(%s)AndFallbackIs(%s)_ShouldReturn(%s)', (
        key,
        fallback,
        expected,
    ) => {
        // Act
        const value = ActionReader.bool({
            raw: ACTION,
            key,
            fallback,
        });

        // Assert
        expect(value).toBe(expected);
    });

    test('strings_WhenListIsMixed_ShouldKeepOnlyTheTexts', () => {
        // Act
        const values = ActionReader.strings(ACTION, 'list');

        // Assert
        expect(values).toEqual([
            'a',
            'b',
            '',
        ]);
    });

    test.each([
        'text',
        'object',
        'nothing',
        'missing',
    ])('strings_WhenKeyIs(%s)_ShouldReturnNoTexts', key => {
        // Act
        const values = ActionReader.strings(ACTION, key);

        // Assert
        expect(values).toEqual([]);
    });

    test('records_WhenListIsMixed_ShouldMapOnlyThePlainObjects', () => {
        // Act
        const names = ActionReader.records({
            raw: ACTION,
            key: 'records',
            map: item => item['name'],
        });

        // Assert
        expect(names).toEqual([
            'x',
            'y',
        ]);
    });

    test.each([
        'object',
        'list',
        'nothing',
        'missing',
    ])('records_WhenKeyIs(%s)_ShouldReturnNoRecords', key => {
        // Act
        const values = ActionReader.records({
            raw: ACTION,
            key,
            map: item => item,
        });

        // Assert
        expect(values).toEqual([]);
    });

    test.each([
        [
            'name',
            undefined,
            'Ann',
        ],
        [
            'age',
            undefined,
            '',
        ],
        [
            'age',
            'unknown',
            'unknown',
        ],
        [
            'missing',
            'n/a',
            'n/a',
        ],
    ])('text_WhenKeyIs(%s)AndFallbackIs(%s)_ShouldReturn(%s)', (
        key,
        fallback,
        expected,
    ) => {
        // Arrange
        const item = {
            name: 'Ann',
            age: 30,
        };

        // Act
        const value = ActionReader.text({
            raw: item,
            key,
            fallback,
        });

        // Assert
        expect(value).toBe(expected);
    });

    test.each([
        [
            {},
            0,
        ],
        [
            {
                delayMs: 1_500,
            },
            1_500,
        ],
        [
            {
                delayMs: 0,
            },
            0,
        ],
        [
            {
                delayMs: -250,
            },
            0,
        ],
        [
            {
                delayMs: 10_000,
            },
            10_000,
        ],
        [
            {
                delayMs: 60_000,
            },
            10_000,
        ],
        [
            {
                delayMs: '1500',
            },
            0,
        ],
        [
            {
                delayMs: Number.POSITIVE_INFINITY,
            },
            0,
        ],
    ])('delay_WhenActionIs(%j)_ShouldReturn(%s)', (action, expected) => {
        // Act
        const delay = ActionReader.delay(action);

        // Assert
        expect(delay).toBe(expected);
    });
});
