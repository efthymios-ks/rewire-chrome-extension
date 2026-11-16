import { describe, expect, test } from 'vitest';
import { RULE_CATEGORY_LABELS } from './RuleCategoryLabels';
import type { RuleType } from './RuleType';
import { RuleTypeRegistry } from './RuleTypeRegistry';
import { allRuleTypes } from './RuleTypeTestData';
import { RULE_CATEGORY } from '../../../Contracts/Rules/RuleCategory';
import { type RuleTypeId, RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';

const DEFAULT_ACTION_ERRORS: Record<RuleTypeId, string[]> = {
    [RULE_TYPE_IDS.RequestHeader]: ["Header name is empty or has characters a header can't carry."],
    [RULE_TYPE_IDS.ResponseHeader]: ["Header name is empty or has characters a header can't carry."],
    [RULE_TYPE_IDS.Cors]: [],
    [RULE_TYPE_IDS.SecurityHeaders]: [],
    [RULE_TYPE_IDS.AllowEmbedding]: [],
    [RULE_TYPE_IDS.RequestCookie]: ['Cookie name is required.'],
    [RULE_TYPE_IDS.ResponseCookie]: ['Cookie name is required.'],
    [RULE_TYPE_IDS.Redirect]: ['Location URL is required.'],
    [RULE_TYPE_IDS.Rewrite]: ['To URL is required.'],
    [RULE_TYPE_IDS.QueryParams]: ['Param is required.'],
    [RULE_TYPE_IDS.UpgradeScheme]: [],
    [RULE_TYPE_IDS.MockResponse]: [],
    [RULE_TYPE_IDS.Delay]: [],
    [RULE_TYPE_IDS.RequestBody]: [],
    [RULE_TYPE_IDS.ResponseBody]: [],
    [RULE_TYPE_IDS.SetVariable]: ['Variable names start with a letter or _ and use letters, digits, _ . -.'],
};

function idsWhere(predicate: (type: RuleType) => boolean): Set<string> {
    return new Set(allRuleTypes()
        .filter(predicate)
        .map(type => type.id));
}

describe('RuleTypeRegistry', () => {
    test('get_WhenEveryKnownIdIsAsked_ShouldFindTheTypeWithThatId', () => {
        // Arrange
        const knownIds = Object.values(RULE_TYPE_IDS);

        // Act
        const ids = knownIds.map(id => RuleTypeRegistry.get(id)?.id);

        // Assert
        expect(ids).toHaveLength(16);
        expect(ids).toEqual(knownIds);
    });

    test.each(Object.values(RULE_TYPE_IDS))('all_WhenTypeIs(%s)_ShouldHaveALabelAndUniqueFieldKeys', id => {
        // Arrange
        const type = RuleTypeRegistry.get(id);

        // Act
        const keys = type?.fields.map(field => field.key) ?? [];

        // Assert
        expect(type).toBeDefined();
        expect(type?.label.trim()).not.toBe('');
        expect(type?.description.trim()).not.toBe('');
        expect(new Set(keys).size).toBe(keys.length);
    });

    test.each(Object.entries(DEFAULT_ACTION_ERRORS))('validate_WhenDefaultActionOf(%s)_ShouldReturn(%j)', (
        id,
        expectedErrors,
    ) => {
        // Arrange
        const type = RuleTypeRegistry.get(id);

        // Act
        const errors = type?.validate(type.defaultAction());

        // Assert
        expect(errors).toEqual(expectedErrors);
    });

    test('all_WhenFilteredByRequestHandling_ShouldLeaveOutOnlyResponseStageTypes', () => {
        // Arrange
        const responseOnly = [
            RULE_TYPE_IDS.ResponseHeader,
            RULE_TYPE_IDS.SecurityHeaders,
            RULE_TYPE_IDS.AllowEmbedding,
            RULE_TYPE_IDS.ResponseCookie,
            RULE_TYPE_IDS.ResponseBody,
        ];

        // Act
        const ids = idsWhere(type => !type.handlesRequest);

        // Assert
        expect(ids).toEqual(new Set(responseOnly));
    });

    test('all_WhenFilteredByResponseHandling_ShouldListTheResponseStageTypes', () => {
        // Arrange
        const responseTypes = [
            RULE_TYPE_IDS.ResponseHeader,
            RULE_TYPE_IDS.Cors,
            RULE_TYPE_IDS.SecurityHeaders,
            RULE_TYPE_IDS.AllowEmbedding,
            RULE_TYPE_IDS.ResponseCookie,
            RULE_TYPE_IDS.MockResponse,
            RULE_TYPE_IDS.ResponseBody,
            RULE_TYPE_IDS.SetVariable,
        ];

        // Act
        const ids = idsWhere(type => type.handlesResponse);

        // Assert
        expect(ids).toEqual(new Set(responseTypes));
    });

    test('all_WhenFilteredByResponseBodyNeed_ShouldListTheTypesThatReadTheServerAnswer', () => {
        // Arrange
        const bodyTypes = [
            RULE_TYPE_IDS.MockResponse,
            RULE_TYPE_IDS.ResponseBody,
            RULE_TYPE_IDS.SetVariable,
        ];

        // Act
        const ids = idsWhere(type => type.needsResponseBody);

        // Assert
        expect(ids).toEqual(new Set(bodyTypes));
    });

    test('all_WhenFilteredByBothEngines_ShouldListOnlyCors', () => {
        // Arrange
        const bothEngineTypes = [RULE_TYPE_IDS.Cors];

        // Act
        const ids = idsWhere(type => type.runsOnBothEngines);

        // Assert
        expect(ids).toEqual(new Set(bothEngineTypes));
    });

    test('withoutSecrets_WhenTheTypeHoldsNoSecrets_ShouldReturnTheActionUnchanged', () => {
        // Arrange
        const secretTypes = [
            RULE_TYPE_IDS.RequestHeader,
            RULE_TYPE_IDS.RequestCookie,
            RULE_TYPE_IDS.ResponseCookie,
        ];
        const plainTypes = allRuleTypes()
            .filter(type => !secretTypes.some(id => id === type.id));

        // Act
        const changed = plainTypes.filter(type => {
            const stripped = JSON.stringify(type.withoutSecrets(type.defaultAction()));

            return stripped !== JSON.stringify(type.defaultAction());
        });

        // Assert
        expect(changed).toEqual([]);
    });

    test('groups_WhenListed_ShouldCoverEveryTypeOnceUnderItsCategory', () => {
        // Arrange
        const categories = [
            RULE_CATEGORY.Headers,
            RULE_CATEGORY.Cookies,
            RULE_CATEGORY.UrlAndRedirects,
            RULE_CATEGORY.MocksAndResponses,
            RULE_CATEGORY.Logic,
        ];
        const labels = categories.map(category => RULE_CATEGORY_LABELS[category]);

        // Act
        const groups = RuleTypeRegistry.groups();

        // Assert
        expect(groups.map(group => group.category)).toEqual(categories);
        expect(groups.map(group => group.label)).toEqual(labels);
        expect(groups.every(group => group.types.length > 0)).toBe(true);
        expect(groups.every(group => group.types.every(type => type.category === group.category))).toBe(true);
        expect(groups.flatMap(group => group.types.map(type => type.id)).sort())
            .toEqual(Object.values(RULE_TYPE_IDS).sort());
    });

    test('get_WhenIdIsKnown_ShouldReturnThatType', () => {
        // Arrange
        const id = RULE_TYPE_IDS.Redirect;

        // Act
        const type = RuleTypeRegistry.get(id);

        // Assert
        expect(type?.id).toBe(id);
    });

    test('get_WhenIdIsUnknown_ShouldReturnUndefined', () => {
        // Arrange
        const id = 'graphQlMock';

        // Act
        const type = RuleTypeRegistry.get(id);

        // Assert
        expect(type).toBeUndefined();
    });
});
