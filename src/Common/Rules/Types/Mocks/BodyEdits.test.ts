import { describe, expect, test } from 'vitest';
import { InMemoryRuleContext } from '../../Context/InMemoryRuleContext';
import { BODY_EDIT_MESSAGES } from './BodyEditMessages';
import { BODY_EDIT_MODES } from './BodyEditModes';
import { type BodyEdit, BodyEdits } from './BodyEdits';
import { FIND_KINDS } from './FindKinds';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import { aRuleContext } from '../../../../TestData';

const JSON_HEADERS: HeaderEntry[] = [
    {
        name: 'content-type',
        value: 'application/json',
    },
    {
        name: 'X-Tenant',
        value: 'blue',
    },
];

function anEdit(overrides: Partial<BodyEdit> = {}): BodyEdit {
    return {
        ...BodyEdits.defaults(),
        ...overrides,
    };
}

function aContextWithName(): InMemoryRuleContext {
    return new InMemoryRuleContext(new Map([
        [
            'name',
            'Zoë',
        ],
    ]));
}

function visibleKeysFor(action: RuleAction): string[] {
    return BodyEdits
        .fields()
        .filter(field => field.visibleWhen == null || field.visibleWhen(action))
        .map(field => field.key);
}

describe('BodyEdits', () => {
    test('defaults_WhenCalled_ShouldReplaceWithAnEmptyBody', () => {
        // Act
        const edit = BodyEdits.defaults();

        // Assert
        expect(edit).toEqual({
            mode: 'replace',
            body: '',
            contentType: '',
            find: '',
            findAs: 'text',
            replace: '',
        });
    });

    test('fields_WhenListed_ShouldOfferEveryModeAndFindKind', () => {
        // Act
        const fields = BodyEdits.fields();

        // Assert
        expect(fields.map(field => field.key)).toEqual([
            'mode',
            'body',
            'contentType',
            'find',
            'findAs',
            'replace',
        ]);
        expect(fields[0]?.options?.map(option => option.value)).toEqual(Object.values(BODY_EDIT_MODES));
        expect(fields[4]?.options?.map(option => option.value)).toEqual(Object.values(FIND_KINDS));
    });

    test.each([
        [
            {
                mode: BODY_EDIT_MODES.Replace,
            },
            [
                'mode',
                'body',
                'contentType',
            ],
        ],
        [
            {
                mode: BODY_EDIT_MODES.JsonMerge,
            },
            [
                'mode',
                'body',
            ],
        ],
        [
            {
                mode: BODY_EDIT_MODES.FindReplace,
            },
            [
                'mode',
                'find',
                'findAs',
                'replace',
            ],
        ],
        [
            {},
            [
                'mode',
                'body',
                'contentType',
            ],
        ],
        [
            {
                find: 'old',
            },
            [
                'mode',
                'find',
                'findAs',
                'replace',
            ],
        ],
    ])('fields_WhenActionIs(%j)_ShouldShow(%j)', (action, expected) => {
        // Act
        const keys = visibleKeysFor(action);

        // Assert
        expect(keys).toEqual(expected);
    });

    test('read_WhenEveryFieldIsStored_ShouldReadThemAndTrimTheContentType', () => {
        // Arrange
        const action = {
            mode: BODY_EDIT_MODES.FindReplace,
            body: ' {"a":1} ',
            contentType: '  text/plain  ',
            find: ' old ',
            findAs: FIND_KINDS.Regex,
            replace: ' new ',
        };

        // Act
        const edit = BodyEdits.read(action);

        // Assert
        expect(edit).toEqual({
            mode: BODY_EDIT_MODES.FindReplace,
            body: ' {"a":1} ',
            contentType: 'text/plain',
            find: ' old ',
            findAs: FIND_KINDS.Regex,
            replace: ' new ',
        });
    });

    test('read_WhenActionIsEmpty_ShouldMatchTheDefaults', () => {
        // Act
        const edit = BodyEdits.read({});

        // Assert
        expect(edit).toEqual(BodyEdits.defaults());
    });

    test.each([
        [
            {
                find: 'old',
            },
            BODY_EDIT_MODES.FindReplace,
        ],
        [
            {
                find: '',
            },
            BODY_EDIT_MODES.Replace,
        ],
        [
            {
                mode: '',
                find: 'old',
            },
            BODY_EDIT_MODES.FindReplace,
        ],
        [
            {
                mode: BODY_EDIT_MODES.JsonMerge,
                find: 'old',
            },
            BODY_EDIT_MODES.JsonMerge,
        ],
        [
            {
                mode: 7,
            },
            BODY_EDIT_MODES.Replace,
        ],
    ])('read_WhenActionIs(%j)_ShouldUseMode(%s)', (action, expected) => {
        // Act
        const edit = BodyEdits.read(action);

        // Assert
        expect(edit.mode).toBe(expected);
    });

    test.each([
        [
            {
                isRegex: true,
            },
            FIND_KINDS.Regex,
        ],
        [
            {
                isRegex: false,
            },
            FIND_KINDS.Text,
        ],
        [
            {
                isRegex: 'yes',
            },
            FIND_KINDS.Text,
        ],
        [
            {
                findAs: FIND_KINDS.Text,
                isRegex: true,
            },
            FIND_KINDS.Text,
        ],
        [
            {
                findAs: '',
                isRegex: true,
            },
            FIND_KINDS.Regex,
        ],
    ])('read_WhenActionIs(%j)_ShouldFindAs(%s)', (action, expected) => {
        // Act
        const edit = BodyEdits.read(action);

        // Assert
        expect(edit.findAs).toBe(expected);
    });

    test.each([
        [
            anEdit(),
            [],
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.FindReplace,
                find: 'old',
            }),
            [],
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.FindReplace,
                find: '  ',
            }),
            ['Find is required.'],
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.FindReplace,
                find: '(',
                findAs: FIND_KINDS.Text,
            }),
            [],
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.FindReplace,
                find: '(',
                findAs: FIND_KINDS.Regex,
            }),
            ['Find is invalid: Invalid regular expression: /(/: Unterminated group'],
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.FindReplace,
                find: '',
                findAs: FIND_KINDS.Regex,
            }),
            ['Find is required.'],
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.JsonMerge,
                body: '{"a":null}',
            }),
            [],
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.JsonMerge,
                body: '{a:1}',
            }),
            [BODY_EDIT_MESSAGES.InvalidPatch],
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.JsonMerge,
                body: '',
            }),
            [BODY_EDIT_MESSAGES.InvalidPatch],
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.Replace,
                body: '{not json',
            }),
            [],
        ],
    ])('check_WhenEditIs(%j)_ShouldReturn(%j)', (edit, expected) => {
        // Act
        const errors = BodyEdits.check(edit);

        // Assert
        expect(errors).toEqual(expected);
    });

    test('check_WhenAJsonPatchUsesAVariableAsABareValue_ShouldSayVariablesBelongInsideStrings', () => {
        // Arrange
        const edit = anEdit({
            mode: BODY_EDIT_MODES.JsonMerge,
            body: '{"id": {{userId}}}',
        });

        // Act
        const errors = BodyEdits.check(edit);

        // Assert
        expect(errors).toEqual(['The JSON patch is not valid JSON. {{variables}} work only inside JSON strings, such as "{{userId}}".']);
    });

    test.each([
        [
            anEdit({
                mode: BODY_EDIT_MODES.FindReplace,
                find: 'old',
                replace: 'new',
            }),
            'old -> new',
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.Replace,
            }),
            'replace',
        ],
        [
            anEdit({
                mode: BODY_EDIT_MODES.JsonMerge,
            }),
            'jsonMerge',
        ],
    ])('describe_WhenEditIs(%j)_ShouldReturn(%s)', (edit, expected) => {
        // Act
        const text = BodyEdits.describe(edit);

        // Assert
        expect(text).toBe(expected);
    });

    test('bodyOf_WhenReplacing_ShouldRenderTheNewBody', () => {
        // Arrange
        const edit = anEdit({
            body: '{"name":"{{name}}"}',
        });

        // Act
        const body = BodyEdits.bodyOf({
            body: '{"name":"old"}',
            edit,
            context: aContextWithName(),
        });

        // Assert
        expect(body).toBe('{"name":"Zoë"}');
    });

    test('bodyOf_WhenReplacingAMissingBody_ShouldStillWriteTheNewBody', () => {
        // Arrange
        const edit = anEdit({
            body: 'created',
        });

        // Act
        const body = BodyEdits.bodyOf({
            body: null,
            edit,
            context: aRuleContext(),
        });

        // Assert
        expect(body).toBe('created');
    });

    test.each([
        BODY_EDIT_MODES.JsonMerge,
        BODY_EDIT_MODES.FindReplace,
    ])('bodyOf_WhenModeIs(%s)AndBodyIsMissing_ShouldKeepItMissing', mode => {
        // Arrange
        const edit = anEdit({
            mode,
            body: '{"a":1}',
            find: 'a',
        });

        // Act
        const body = BodyEdits.bodyOf({
            body: null,
            edit,
            context: aRuleContext(),
        });

        // Assert
        expect(body).toBeNull();
    });

    test('bodyOf_WhenMergingAJsonPatch_ShouldMergeAndRemoveNullKeys', () => {
        // Arrange
        const edit = anEdit({
            mode: BODY_EDIT_MODES.JsonMerge,
            body: '{"name":"{{name}}","secret":null,"meta":{"v":2}}',
        });

        // Act
        const body = BodyEdits.bodyOf({
            body: '{"id":42,"name":"old","secret":"x","meta":{"v":1,"keep":true}}',
            edit,
            context: aContextWithName(),
        });

        // Assert
        expect(JSON.parse(body!)).toEqual({
            id: 42,
            name: 'Zoë',
            meta: {
                v: 2,
                keep: true,
            },
        });
    });

    test.each([
        [
            'not json',
            '{"a":1}',
        ],
        [
            '{"a":1}',
            '{broken',
        ],
    ])('bodyOf_WhenMergingAndBodyIs(%s)AndPatchIs(%s)_ShouldKeepTheBody', (original, patch) => {
        // Arrange
        const edit = anEdit({
            mode: BODY_EDIT_MODES.JsonMerge,
            body: patch,
        });

        // Act
        const body = BodyEdits.bodyOf({
            body: original,
            edit,
            context: aRuleContext(),
        });

        // Assert
        expect(body).toBe(original);
    });

    test('bodyOf_WhenFindingText_ShouldReplaceEveryLiteralMatch', () => {
        // Arrange
        const edit = anEdit({
            mode: BODY_EDIT_MODES.FindReplace,
            find: 'a.b',
            replace: '{{name}}',
        });

        // Act
        const body = BodyEdits.bodyOf({
            body: 'a.b axb a.b',
            edit,
            context: aContextWithName(),
        });

        // Assert
        expect(body).toBe('Zoë axb Zoë');
    });

    test('bodyOf_WhenFindingARegex_ShouldReplaceEveryMatchWithGroups', () => {
        // Arrange
        const edit = anEdit({
            mode: BODY_EDIT_MODES.FindReplace,
            find: '"id":(\\d+)',
            findAs: FIND_KINDS.Regex,
            replace: '"id":"$1"',
        });

        // Act
        const body = BodyEdits.bodyOf({
            body: '[{"id":1},{"id":22}]',
            edit,
            context: aRuleContext(),
        });

        // Assert
        expect(body).toBe('[{"id":"1"},{"id":"22"}]');
    });

    test('bodyOf_WhenFindingAnInvalidRegex_ShouldKeepTheBody', () => {
        // Arrange
        const edit = anEdit({
            mode: BODY_EDIT_MODES.FindReplace,
            find: '(',
            findAs: FIND_KINDS.Regex,
            replace: 'x',
        });

        // Act
        const body = BodyEdits.bodyOf({
            body: 'a(b',
            edit,
            context: aRuleContext(),
        });

        // Assert
        expect(body).toBe('a(b');
    });

    test.each([
        'bogus',
        'toString',
        'constructor',
        'valueOf',
    ])('bodyOf_WhenModeIs(%s)_ShouldFallBackToReplacing', mode => {
        // Arrange
        const edit = anEdit({
            mode,
            body: 'new {{name}}',
        });

        // Act
        const body = BodyEdits.bodyOf({
            body: 'old',
            edit,
            context: aContextWithName(),
        });

        // Assert
        expect(body).toBe('new Zoë');
    });

    test('headersOf_WhenReplacingWithAContentType_ShouldSetItOnce', () => {
        // Arrange
        const edit = anEdit({
            contentType: 'text/plain',
        });

        // Act
        const headers = BodyEdits.headersOf(JSON_HEADERS, edit);

        // Assert
        expect(headers).toEqual([
            {
                name: 'X-Tenant',
                value: 'blue',
            },
            {
                name: 'Content-Type',
                value: 'text/plain',
            },
        ]);
    });

    test('headersOf_WhenReplacingWithoutAContentType_ShouldKeepTheHeaders', () => {
        // Arrange
        const edit = anEdit();

        // Act
        const headers = BodyEdits.headersOf(JSON_HEADERS, edit);

        // Assert
        expect(headers).toBe(JSON_HEADERS);
    });

    test.each([
        BODY_EDIT_MODES.JsonMerge,
        BODY_EDIT_MODES.FindReplace,
    ])('headersOf_WhenModeIs(%s)_ShouldIgnoreTheContentType', mode => {
        // Arrange
        const edit = anEdit({
            mode,
            contentType: 'text/plain',
        });

        // Act
        const headers = BodyEdits.headersOf(JSON_HEADERS, edit);

        // Assert
        expect(headers).toBe(JSON_HEADERS);
    });
});
