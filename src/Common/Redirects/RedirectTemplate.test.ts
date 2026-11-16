import { describe, expect, test } from 'vitest';
import { RedirectTemplate } from './RedirectTemplate';
import { TEMPLATE_PART_KIND } from './TemplatePartKind';

describe('RedirectTemplate', () => {
    test('parse_WhenTemplateHasDollarTokens_ShouldSplitLiteralsAndReferences', () => {
        // Arrange
        const template = 'http://localhost/$1/$$/$12';

        // Act
        const parts = RedirectTemplate.parse(template);

        // Assert
        expect(parts).toEqual([
            {
                kind: TEMPLATE_PART_KIND.Literal,
                text: 'http://localhost/',
            },
            {
                kind: TEMPLATE_PART_KIND.GroupReference,
                groupIndex: 1,
            },
            {
                kind: TEMPLATE_PART_KIND.Literal,
                text: '/$/',
            },
            {
                kind: TEMPLATE_PART_KIND.GroupReference,
                groupIndex: 1,
            },
            {
                kind: TEMPLATE_PART_KIND.Literal,
                text: '2',
            },
        ]);
    });

    test('referencedGroups_WhenGroupsRepeat_ShouldReturnSortedUniqueIndexes', () => {
        // Arrange
        const parts = RedirectTemplate.parse('$2/$1/$2/$0');

        // Act
        const groups = RedirectTemplate.referencedGroups(parts);

        // Assert
        expect(groups).toEqual([
            0,
            1,
            2,
        ]);
    });

    test('toSubstitution_WhenTemplateHasBoth_ShouldUseBackslashReferencesAndEscapeBackslashes', () => {
        // Arrange
        const parts = RedirectTemplate.parse('a\\b/$2');

        // Act
        const substitution = RedirectTemplate.toSubstitution(parts);

        // Assert
        expect(substitution).toBe('a\\\\b/\\2');
    });

    test('render_WhenGroupDidNotParticipate_ShouldUseEmptyText', () => {
        // Arrange
        const parts = RedirectTemplate.parse('/users/$1/$2');

        // Act
        const rendered = RedirectTemplate.render(
            /* parts: */ parts,
            /* groups: */ [
                'whole',
                '42',
                undefined,
            ],
        );

        // Assert
        expect(rendered).toBe('/users/42/');
    });
});
