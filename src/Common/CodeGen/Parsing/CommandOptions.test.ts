import { describe, expect, test } from 'vitest';
import { CommandOptions } from './CommandOptions';

interface State {
    values: string[];
    flags: string[];
}

function newState(): State {
    return {
        values: [],
        flags: [],
    };
}

const OPTIONS = new CommandOptions<State>({
    valueHandlers: {
        header: (state, value) => state.values.push(`header:${value}`),
    },
    flagHandlers: {
        get: state => state.flags.push('get'),
    },
    ignoredValueOptions: ['output'],
});

describe('CommandOptions', () => {
    test.each([
        [
            '--header',
            true,
        ],
        [
            '--',
            false,
        ],
        [
            '-H',
            false,
        ],
        [
            'https://api.example.com',
            false,
        ],
    ])('isLong_WhenTheArgumentIs(%j)_ShouldReturn(%s)', (argument, expected) => {
        // Act
        const isLong = CommandOptions.isLong(argument);

        // Assert
        expect(isLong).toBe(expected);
    });

    test.each([
        [
            'header',
            true,
        ],
        [
            'output',
            true,
        ],
        [
            'get',
            false,
        ],
        [
            'toString',
            false,
        ],
    ])('takesValue_WhenTheOptionIs(%s)_ShouldReturn(%s)', (option, expected) => {
        // Act
        const takesValue = OPTIONS.takesValue(option);

        // Assert
        expect(takesValue).toBe(expected);
    });

    test('readLong_WhenTheValueIsInline_ShouldApplyItAndStayOnTheSameArgument', () => {
        // Arrange
        const state = newState();

        // Act
        const lastIndex = OPTIONS.readLong({
            state,
            args: ['--header=Accept: */*', 'next'],
            index: 0,
        });

        // Assert
        expect(lastIndex).toBe(0);
        expect(state.values).toEqual(['header:Accept: */*']);
    });

    test('readLong_WhenTheValueIsTheNextArgument_ShouldApplyItAndSkipIt', () => {
        // Arrange
        const state = newState();

        // Act
        const lastIndex = OPTIONS.readLong({
            state,
            args: ['curl', '--header', 'Accept: */*'],
            index: 1,
        });

        // Assert
        expect(lastIndex).toBe(2);
        expect(state.values).toEqual(['header:Accept: */*']);
    });

    test('readLong_WhenTheValueIsMissing_ShouldMovePastTheEnd', () => {
        // Arrange
        const state = newState();

        // Act
        const lastIndex = OPTIONS.readLong({
            state,
            args: ['--header'],
            index: 0,
        });

        // Assert
        expect(lastIndex).toBe(1);
        expect(state.values).toEqual([]);
    });

    test('readLong_WhenTheOptionIsAFlag_ShouldApplyItWithoutTakingAValue', () => {
        // Arrange
        const state = newState();

        // Act
        const lastIndex = OPTIONS.readLong({
            state,
            args: ['--get', 'https://api.example.com'],
            index: 0,
        });

        // Assert
        expect(lastIndex).toBe(0);
        expect(state.flags).toEqual(['get']);
    });

    test('readLong_WhenTheOptionIsIgnored_ShouldSkipItsValueWithoutApplyingIt', () => {
        // Arrange
        const state = newState();

        // Act
        const lastIndex = OPTIONS.readLong({
            state,
            args: ['--output', 'file.txt'],
            index: 0,
        });

        // Assert
        expect(lastIndex).toBe(1);
        expect(state).toEqual(newState());
    });

    test('readLong_WhenTheOptionIsUnknown_ShouldIgnoreIt', () => {
        // Arrange
        const state = newState();

        // Act
        const lastIndex = OPTIONS.readLong({
            state,
            args: ['--verbose', 'https://api.example.com'],
            index: 0,
        });

        // Assert
        expect(lastIndex).toBe(0);
        expect(state).toEqual(newState());
    });
});
