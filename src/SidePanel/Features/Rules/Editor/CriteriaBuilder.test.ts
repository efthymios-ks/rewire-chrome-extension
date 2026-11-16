import { describe, expect, test, vi } from 'vitest';
import { CRITERIA_MATCHES } from '../../../../Contracts/Rules/CriteriaMatches';
import { CRITERION_FIELD_IDS } from '../../../../Contracts/Rules/CriterionFieldIds';
import { CriteriaBuilder } from './CriteriaBuilder';
import { aCriterion } from '../../../../TestData';
import { typeInto } from '../../../PanelTestData';

function suggestionsOf(input: HTMLInputElement): string[] {
    const list = input.parentElement!.querySelector<HTMLElement>('.suggestion-list')!;

    return list.hidden
        ? []
        : [...list.querySelectorAll('.suggestion-item')].map(item => item.textContent ?? '');
}

describe('CriteriaBuilder', () => {
    test('headerValue_WhenTheHeaderNameChanges_ShouldFollowItsSuggestions', () => {
        // Arrange
        const builder = new CriteriaBuilder(
            /* criteria: */ {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.RequestHeader,
                        op: 'wildcard',
                        name: 'Authorization',
                        value: '',
                    }),
                ],
            },
            /* onChange: */ vi.fn(),
        );
        const name = builder.root.querySelector<HTMLInputElement>('.criterion-name')!;
        const value = builder.root.querySelector<HTMLInputElement>('.criterion-value')!;

        // Act
        typeInto(value, 'a');
        const forAuthorization = suggestionsOf(value);
        typeInto(name, 'Accept');
        typeInto(value, 'application/x');
        const forAccept = suggestionsOf(value);

        // Assert
        expect(forAuthorization).toEqual([]);
        expect(forAccept).toContain('application/xml');
    });

    test('contentTypeValue_WhenTyped_ShouldSuggestMediaTypes', () => {
        // Arrange
        const builder = new CriteriaBuilder(
            /* criteria: */ {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.ContentType,
                        op: 'wildcard',
                        value: '',
                    }),
                ],
            },
            /* onChange: */ vi.fn(),
        );
        const value = builder.root.querySelector<HTMLInputElement>('.criterion-value')!;

        // Act
        typeInto(value, 'image/p');

        // Assert
        expect(suggestionsOf(value)).toEqual(['image/png']);
    });
});
