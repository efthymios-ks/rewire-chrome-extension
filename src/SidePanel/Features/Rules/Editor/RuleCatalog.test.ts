import { describe, expect, test, vi } from 'vitest';
import { RuleTypeRegistry } from '../../../../Common/Rules/Types/RuleTypeRegistry';
import { allRuleTypes } from '../../../../Common/Rules/Types/RuleTypeTestData';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { RuleCatalog } from './RuleCatalog';
import { click, typeInto } from '../../../PanelTestData';

function searchOf(catalog: RuleCatalog): HTMLInputElement {
    return catalog.root.querySelector<HTMLInputElement>('input')!;
}

function itemLabelsOf(catalog: RuleCatalog): string[] {
    return [...catalog.root.querySelectorAll('.catalog-item strong')].map(label => label.textContent ?? '');
}

function groupTitlesOf(catalog: RuleCatalog): string[] {
    return [...catalog.root.querySelectorAll('.catalog-group-title')].map(title => title.textContent ?? '');
}

describe('RuleCatalog', () => {
    test('constructor_WhenBuilt_ShouldListEveryTypeUnderItsNonEmptyGroup', () => {
        // Arrange
        const groups = RuleTypeRegistry.groups().filter(group => group.types.length > 0);

        // Act
        const catalog = new RuleCatalog(vi.fn());

        // Assert
        expect(searchOf(catalog).getAttribute('aria-label')).toBe('Search rule types');
        expect(searchOf(catalog).placeholder).toBe('Search rule types');
        expect(groupTitlesOf(catalog)).toEqual(groups.map(group => group.label));
        expect(itemLabelsOf(catalog)).toEqual(groups.flatMap(group => group.types.map(type => type.label)));
        expect(catalog.root.querySelector('.catalog-item-description')?.textContent)
            .toBe(groups[0]?.types[0]?.description);
    });

    test('search_WhenTextMatchesLabelsOrDescriptions_ShouldKeepOnlyThoseTypesAndGroups', () => {
        // Arrange
        const catalog = new RuleCatalog(vi.fn());

        // Act
        typeInto(searchOf(catalog), '  COOKIE  ');

        // Assert
        expect(groupTitlesOf(catalog)).toEqual([
            'Cookies',
            'Logic',
        ]);
        expect(itemLabelsOf(catalog)).toEqual([
            'Request cookie',
            'Response cookie',
            'Set variable',
        ]);
    });

    test('search_WhenTextMatchesOnlyADescription_ShouldKeepThatType', () => {
        // Arrange
        const catalog = new RuleCatalog(vi.fn());

        // Act
        typeInto(searchOf(catalog), 'preflights');

        // Assert
        expect(itemLabelsOf(catalog)).toEqual(['CORS']);
    });

    test('search_WhenNothingMatches_ShouldShowNoGroups', () => {
        // Arrange
        const catalog = new RuleCatalog(vi.fn());

        // Act
        typeInto(searchOf(catalog), 'zzz-no-such-rule');

        // Assert
        expect(catalog.root.querySelectorAll('.catalog-group')).toHaveLength(0);
    });

    test('search_WhenCleared_ShouldListEveryTypeAgain', () => {
        // Arrange
        const catalog = new RuleCatalog(vi.fn());
        typeInto(searchOf(catalog), 'zzz-no-such-rule');

        // Act
        typeInto(searchOf(catalog), '');

        // Assert
        expect(itemLabelsOf(catalog)).toHaveLength(allRuleTypes().length);
    });

    test('item_WhenClicked_ShouldPickThatType', () => {
        // Arrange
        const onPick = vi.fn();
        const catalog = new RuleCatalog(onPick);
        const mock = RuleTypeRegistry.get(RULE_TYPE_IDS.MockResponse)!;
        const item = [...catalog.root.querySelectorAll('.catalog-item')]
            .find(candidate => candidate.querySelector('strong')?.textContent === mock.label);

        // Act
        click(item);

        // Assert
        expect(onPick).toHaveBeenCalledWith(mock);
    });
});
