import { describe, expect, test } from "vitest";
import type { IRuleType } from "../../../../src/Common/Rules/Types/IRuleType";
import { RuleCategoryLabels, RuleTypeRegistry } from "../../../../src/Common/Rules/Types/RuleTypeRegistry";
import { RuleCategory } from "../../../../src/Contracts/Rules/RuleCategory";
import { type RuleTypeId, RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";

const defaultActionErrors: Record<RuleTypeId, string[]> = {
    [RuleTypeIds.RequestHeader]: ["Header name is empty or has characters a header can't carry."],
    [RuleTypeIds.ResponseHeader]: ["Header name is empty or has characters a header can't carry."],
    [RuleTypeIds.Cors]: [],
    [RuleTypeIds.SecurityHeaders]: [],
    [RuleTypeIds.AllowEmbedding]: [],
    [RuleTypeIds.RequestCookie]: ["Cookie name is required."],
    [RuleTypeIds.ResponseCookie]: ["Cookie name is required."],
    [RuleTypeIds.Redirect]: ["Location URL is required."],
    [RuleTypeIds.Rewrite]: ["To URL is required."],
    [RuleTypeIds.QueryParams]: ["Param is required."],
    [RuleTypeIds.UpgradeScheme]: [],
    [RuleTypeIds.MockResponse]: [],
    [RuleTypeIds.Delay]: [],
    [RuleTypeIds.RequestBody]: [],
    [RuleTypeIds.ResponseBody]: [],
    [RuleTypeIds.SetVariable]: ["Variable names start with a letter or _ and use letters, digits, _ . -."],
};

function idsWhere(predicate: (type: IRuleType) => boolean): Set<string> {
    return new Set(RuleTypeRegistry
        .all()
        .filter(predicate)
        .map(type => type.id));
}

describe("RuleTypeRegistry", () => {
    test("all_WhenListed_ShouldRegisterEveryKnownTypeIdOnce", () => {
        // Arrange
        const knownIds = Object.values(RuleTypeIds);

        // Act
        const ids = RuleTypeRegistry
            .all()
            .map(type => type.id);

        // Assert
        expect(ids).toHaveLength(16);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(ids)).toEqual(new Set(knownIds));
    });

    test.each(Object.values(RuleTypeIds))("all_WhenTypeIs(%s)_ShouldHaveALabelAndUniqueFieldKeys", id => {
        // Arrange
        const type = RuleTypeRegistry.get(id);

        // Act
        const keys = type?.fields.map(field => field.key) ?? [];

        // Assert
        expect(type).toBeDefined();
        expect(type?.label.trim()).not.toBe("");
        expect(type?.description.trim()).not.toBe("");
        expect(new Set(keys).size).toBe(keys.length);
    });

    test.each(Object.entries(defaultActionErrors))("validate_WhenDefaultActionOf(%s)_ShouldReturn(%j)", (id, expectedErrors) => {
        // Arrange
        const type = RuleTypeRegistry.get(id);

        // Act
        const errors = type?.validate(type.defaultAction());

        // Assert
        expect(errors).toEqual(expectedErrors);
    });

    test("all_WhenFilteredByRequestHandling_ShouldLeaveOutOnlyResponseStageTypes", () => {
        // Arrange
        const responseOnly = [
            RuleTypeIds.ResponseHeader,
            RuleTypeIds.SecurityHeaders,
            RuleTypeIds.AllowEmbedding,
            RuleTypeIds.ResponseCookie,
            RuleTypeIds.ResponseBody,
        ];

        // Act
        const ids = idsWhere(type => !type.handlesRequest);

        // Assert
        expect(ids).toEqual(new Set(responseOnly));
    });

    test("all_WhenFilteredByResponseHandling_ShouldListTheResponseStageTypes", () => {
        // Arrange
        const responseTypes = [
            RuleTypeIds.ResponseHeader,
            RuleTypeIds.Cors,
            RuleTypeIds.SecurityHeaders,
            RuleTypeIds.AllowEmbedding,
            RuleTypeIds.ResponseCookie,
            RuleTypeIds.MockResponse,
            RuleTypeIds.ResponseBody,
            RuleTypeIds.SetVariable,
        ];

        // Act
        const ids = idsWhere(type => type.handlesResponse);

        // Assert
        expect(ids).toEqual(new Set(responseTypes));
    });

    test("all_WhenFilteredByResponseBodyNeed_ShouldListTheTypesThatReadTheServerAnswer", () => {
        // Arrange
        const bodyTypes = [
            RuleTypeIds.MockResponse,
            RuleTypeIds.ResponseBody,
            RuleTypeIds.SetVariable,
        ];

        // Act
        const ids = idsWhere(type => type.needsResponseBody);

        // Assert
        expect(ids).toEqual(new Set(bodyTypes));
    });

    test("all_WhenFilteredByBothEngines_ShouldListOnlyCors", () => {
        // Arrange
        const bothEngineTypes = [RuleTypeIds.Cors];

        // Act
        const ids = idsWhere(type => type.runsOnBothEngines);

        // Assert
        expect(ids).toEqual(new Set(bothEngineTypes));
    });

    test("withoutSecrets_WhenTheTypeHoldsNoSecrets_ShouldReturnTheActionUnchanged", () => {
        // Arrange
        const secretTypes = [
            RuleTypeIds.RequestHeader,
            RuleTypeIds.RequestCookie,
            RuleTypeIds.ResponseCookie,
        ];
        const plainTypes = RuleTypeRegistry
            .all()
            .filter(type => !secretTypes.some(id => id === type.id));

        // Act
        const changed = plainTypes.filter(type => JSON.stringify(type.withoutSecrets(type.defaultAction())) !== JSON.stringify(type.defaultAction()));

        // Assert
        expect(changed).toEqual([]);
    });

    test("groups_WhenListed_ShouldCoverEveryTypeOnceUnderItsCategory", () => {
        // Arrange
        const categories = [
            RuleCategory.Headers,
            RuleCategory.Cookies,
            RuleCategory.UrlAndRedirects,
            RuleCategory.MocksAndResponses,
            RuleCategory.Logic,
        ];

        // Act
        const groups = RuleTypeRegistry.groups();

        // Assert
        expect(groups.map(group => group.category)).toEqual(categories);
        expect(groups.map(group => group.label)).toEqual(categories.map(category => RuleCategoryLabels[category]));
        expect(groups.every(group => group.types.length > 0)).toBe(true);
        expect(groups.every(group => group.types.every(type => type.category === group.category))).toBe(true);
        expect(groups.flatMap(group => group.types)).toHaveLength(RuleTypeRegistry.all().length);
    });

    test("get_WhenIdIsKnown_ShouldReturnThatType", () => {
        // Arrange
        const id = RuleTypeIds.Redirect;

        // Act
        const type = RuleTypeRegistry.get(id);

        // Assert
        expect(type?.id).toBe(id);
    });

    test("get_WhenIdIsUnknown_ShouldReturnUndefined", () => {
        // Arrange
        const id = "graphQlMock";

        // Act
        const type = RuleTypeRegistry.get(id);

        // Assert
        expect(type).toBeUndefined();
    });
});
