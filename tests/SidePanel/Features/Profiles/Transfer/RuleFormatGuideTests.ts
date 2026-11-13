import { describe, expect, test } from "vitest";
import { ProfileTransfer } from "../../../../../src/Common/Profiles/Transfer/ProfileTransfer";
import { CriterionFields } from "../../../../../src/Common/Rules/Criteria/CriterionFields";
import { CriterionOperators } from "../../../../../src/Common/Rules/Criteria/CriterionOperators";
import { ResourceTypeOptions } from "../../../../../src/Common/Rules/Criteria/ResourceTypes";
import { OperationKinds } from "../../../../../src/Common/Rules/Types/OperationKinds";
import { RuleTypeRegistry } from "../../../../../src/Common/Rules/Types/RuleTypeRegistry";
import type { Rule } from "../../../../../src/Contracts/Rules/Rule";
import { RuleFormatGuide } from "../../../../../src/SidePanel/Features/Profiles/Transfer/RuleFormatGuide";

const JsonBlockPattern = /```json\n([\s\S]*?)```/g;

function exampleRules(): Rule[] {
    return [...RuleFormatGuide.text().matchAll(JsonBlockPattern)]
        .map(match => JSON.parse(match[1] ?? "") as Record<string, unknown>)
        .filter(block => typeof block["type"] === "string" && block["action"] !== undefined) as unknown as Rule[];
}

function undocumented(names: string[]): string[] {
    const text = RuleFormatGuide.text();

    return names
        .filter(name => name !== "")
        .filter(name => !text.includes(`\`${name}\``));
}

describe("RuleFormatGuide", () => {
    test("text_WhenRead_ShouldHoldAnExampleOfEveryRuleType", () => {
        // Arrange
        const typeIds = RuleTypeRegistry.all().map(type => type.id);

        // Act
        const exampleTypes = new Set(exampleRules().map(rule => rule.type));

        // Assert
        expect(typeIds.filter(typeId => !exampleTypes.has(typeId))).toEqual([]);
    });

    test("text_WhenEveryExampleIsChecked_ShouldHaveNoErrors", () => {
        // Arrange
        const rules = exampleRules();

        // Act
        const errors = rules.flatMap(rule => (RuleTypeRegistry.get(rule.type)?.validate(rule.action, rule.criteria) ?? ["unknown type"])
            .map(error => `${rule.id}: ${error}`));

        // Assert
        expect(errors).toEqual([]);
    });

    test("text_WhenEveryExampleIsImported_ShouldImportThemAll", () => {
        // Arrange
        const file = JSON.stringify({
            schemaVersion: 5,
            profiles: [
                {
                    id: "guide-examples",
                    name: "Guide examples",
                    rules: exampleRules(),
                    variables: [],
                },
            ],
        });

        // Act
        const parsed = ProfileTransfer.parse(file);

        // Assert
        expect(parsed.hasErrors ? parsed.error : parsed.value.profiles[0]?.rules.length).toBe(exampleRules().length);
    });

    test("text_WhenRead_ShouldDocumentEveryTypeKeyAndOption", () => {
        // Arrange
        const names = RuleTypeRegistry.all().flatMap(type => [
            type.id,
            ...Object.keys(type.defaultAction()),
            ...type.fields.map(field => field.key),
            ...type.fields.flatMap(field => (field.options ?? []).map(option => option.value)),
        ]);

        // Act
        const missing = undocumented(names);

        // Assert
        expect(missing).toEqual([]);
    });

    test("text_WhenRead_ShouldDocumentEveryConditionOperatorAndResourceType", () => {
        // Arrange
        const names = [
            ...CriterionFields.map(field => field.id),
            ...CriterionOperators.map(operator => operator.id),
            ...ResourceTypeOptions.map(option => option.id),
            ...Object.values(OperationKinds),
        ];

        // Act
        const missing = undocumented(names);

        // Assert
        expect(missing).toEqual([]);
    });
});
