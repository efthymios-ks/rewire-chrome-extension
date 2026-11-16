import { describe, expect, test } from 'vitest';
import { DNR_FRAGMENT_KIND } from './DnrFragmentKind';
import { DnrFragments } from './DnrFragments';

describe('DnrFragments', () => {
    test('condition_WhenPatchIsGiven_ShouldWrapItAsCondition', () => {
        // Arrange
        const patch = {
            requestMethods: ['get' as const],
        };

        // Act
        const fragment = DnrFragments.condition(patch);

        // Assert
        expect(fragment).toEqual({
            kind: DNR_FRAGMENT_KIND.Condition,
            patch: {
                requestMethods: ['get'],
            },
        });
    });

    test('regex_WhenSourceIsGiven_ShouldWrapItAsRegex', () => {
        // Arrange
        const source = '^https://api\\.example\\.com/.*$';

        // Act
        const fragment = DnrFragments.regex(source);

        // Assert
        expect(fragment).toEqual({
            kind: DNR_FRAGMENT_KIND.Regex,
            source,
        });
    });

    test('unsupported_WhenReasonIsGiven_ShouldCarryTheReason', () => {
        // Arrange
        const reason = 'Sampling works on the inspected tab only.';

        // Act
        const fragment = DnrFragments.unsupported(reason);

        // Assert
        expect(fragment).toEqual({
            kind: DNR_FRAGMENT_KIND.Unsupported,
            reason,
        });
    });
});
