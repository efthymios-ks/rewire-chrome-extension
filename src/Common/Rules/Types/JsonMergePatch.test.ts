import { describe, expect, test } from 'vitest';
import { JsonMergePatch } from './JsonMergePatch';

describe('JsonMergePatch', () => {
    test.each([
        [
            '{"a":"b"}',
            '{"a":"c"}',
            '{"a":"c"}',
        ],
        [
            '{"a":"b"}',
            '{"b":"c"}',
            '{"a":"b","b":"c"}',
        ],
        [
            '{"a":"b"}',
            '{"a":null}',
            '{}',
        ],
        [
            '{"a":"b","b":"c"}',
            '{"a":null}',
            '{"b":"c"}',
        ],
        [
            '{"a":["b"]}',
            '{"a":"c"}',
            '{"a":"c"}',
        ],
        [
            '{"a":"c"}',
            '{"a":["b"]}',
            '{"a":["b"]}',
        ],
        [
            '{"a":{"b":"c"}}',
            '{"a":{"b":"d","c":null}}',
            '{"a":{"b":"d"}}',
        ],
        [
            '{"a":[{"b":"c"}]}',
            '{"a":[1]}',
            '{"a":[1]}',
        ],
        [
            '["a","b"]',
            '["c","d"]',
            '["c","d"]',
        ],
        [
            '{"a":"b"}',
            '["c"]',
            '["c"]',
        ],
        [
            '{"a":"foo"}',
            'null',
            'null',
        ],
        [
            '{"a":"foo"}',
            '"bar"',
            '"bar"',
        ],
        [
            '{"e":null}',
            '{"a":1}',
            '{"e":null,"a":1}',
        ],
        [
            '[1,2]',
            '{"a":"b","c":null}',
            '{"a":"b"}',
        ],
        [
            '{}',
            '{"a":{"bb":{"ccc":null}}}',
            '{"a":{"bb":{}}}',
        ],
    ])('apply_WhenTargetIs(%s)AndPatchIs(%s)_ShouldReturn(%s)', (
        target,
        patch,
        expected,
    ) => {
        // Arrange
        const parsedTarget: unknown = JSON.parse(target);
        const parsedPatch: unknown = JSON.parse(patch);

        // Act
        const merged = JsonMergePatch.apply(parsedTarget, parsedPatch);

        // Assert
        expect(merged).toEqual(JSON.parse(expected));
    });

    test('apply_WhenMerging_ShouldLeaveTheTargetUntouched', () => {
        // Arrange
        const target = {
            name: 'Ada',
            address: {
                city: 'Athens',
            },
        };
        const patch = {
            name: null,
            address: {
                city: 'Patras',
            },
        };

        // Act
        JsonMergePatch.apply(target, patch);

        // Assert
        expect(target).toEqual({
            name: 'Ada',
            address: {
                city: 'Athens',
            },
        });
    });

    test('apply_WhenThePatchHasAProtoKey_ShouldSetAnOwnKeyAndLeaveThePrototypeAlone', () => {
        // Arrange
        const target = JSON.parse('{"a":1}');
        const patch = JSON.parse('{"__proto__":{"isPolluted":true},"constructor":{"name":"x"}}');

        // Act
        const merged = JsonMergePatch.apply(target, patch);

        // Assert
        expect(JSON.stringify(merged))
            .toBe('{"a":1,"__proto__":{"isPolluted":true},"constructor":{"name":"x"}}');
        expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
        expect(Object.hasOwn(Object.prototype, 'isPolluted')).toBe(false);
    });
});
