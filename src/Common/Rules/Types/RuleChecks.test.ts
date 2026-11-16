import { describe, expect, test } from 'vitest';
import { RuleChecks } from './RuleChecks';

describe('RuleChecks', () => {
    test.each([
        'Content-Type',
        'x-api-key',
        '  X-Trimmed  ',
        "!#$%&'*+.^_`|~09AZaz-",
    ])('headerName_WhenNameIs(%s)_ShouldPass', name => {
        // Act
        const errors = RuleChecks.headerName(name);

        // Assert
        expect(errors).toEqual([]);
    });

    test.each([
        '',
        '   ',
        'X Token',
        'X-Tökén',
        'Content-Type:',
        'X-(Bad)',
        'X/Path',
    ])('headerName_WhenNameIs(%s)_ShouldReportIt', name => {
        // Act
        const errors = RuleChecks.headerName(name);

        // Assert
        expect(errors).toEqual(["Header name is empty or has characters a header can't carry."]);
    });

    test('headerName_WhenLabelIsGiven_ShouldUseItInTheMessage', () => {
        // Act
        const errors = RuleChecks.headerName('', 'Cookie name');

        // Assert
        expect(errors).toEqual(["Cookie name is empty or has characters a header can't carry."]);
    });

    test.each([
        null,
        100,
        200,
        404,
        599,
    ])('status_WhenStatusIs(%s)_ShouldPass', status => {
        // Act
        const errors = RuleChecks.status(status);

        // Assert
        expect(errors).toEqual([]);
    });

    test.each([
        99,
        600,
        0,
        -200,
        200.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
    ])('status_WhenStatusIs(%s)_ShouldReportIt', status => {
        // Act
        const errors = RuleChecks.status(status);

        // Assert
        expect(errors).toEqual(['Status must be a whole number from 100 to 599.']);
    });

    test('status_WhenLabelIsGiven_ShouldUseItInTheMessage', () => {
        // Act
        const errors = RuleChecks.status(1_000, 'Redirect status');

        // Assert
        expect(errors).toEqual(['Redirect status must be a whole number from 100 to 599.']);
    });

    test.each([
        [
            '',
            ['Target is required.'],
        ],
        [
            ' \t\n',
            ['Target is required.'],
        ],
        [
            'x',
            [],
        ],
        [
            ' ü ',
            [],
        ],
    ])('required_WhenTextIs(%j)_ShouldReturn(%j)', (text, expected) => {
        // Act
        const errors = RuleChecks.required(text, 'Target');

        // Assert
        expect(errors).toEqual(expected);
    });

    test.each([
        '',
        '^/api/(\\d+)$',
        '(?P<id>\\d+)',
        '\\p{L}',
    ])('regex_WhenSourceIs(%s)_ShouldPass', source => {
        // Act
        const errors = RuleChecks.regex(source, 'Pattern');

        // Assert
        expect(errors).toEqual([]);
    });

    test.each([
        [
            '(',
            'Pattern is invalid: Invalid regular expression: /(/: Unterminated group',
        ],
        [
            '[a-',
            'Pattern is invalid: Invalid regular expression: /[a-/: Unterminated character class',
        ],
    ])('regex_WhenSourceIs(%s)_ShouldReport(%s)', (source, expected) => {
        // Act
        const errors = RuleChecks.regex(source, 'Pattern');

        // Assert
        expect(errors).toEqual([expected]);
    });
});
