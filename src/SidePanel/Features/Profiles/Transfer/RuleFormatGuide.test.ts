import { describe, expect, test } from 'vitest';
import { ProfileTransfer } from '../../../../Common/Profiles/Transfer/ProfileTransfer';
import { CRITERION_FIELDS } from '../../../../Common/Rules/Criteria/CriterionFields';
import { CRITERION_OPERATORS } from '../../../../Common/Rules/Criteria/CriterionOperators';
import { RESOURCE_TYPE_OPTIONS } from '../../../../Common/Rules/Criteria/ResourceTypeOption';
import { OPERATION_KINDS } from '../../../../Common/Rules/Types/OperationKinds';
import { RuleTypeRegistry } from '../../../../Common/Rules/Types/RuleTypeRegistry';
import { allRuleTypes } from '../../../../Common/Rules/Types/RuleTypeTestData';
import type { Rule } from '../../../../Contracts/Rules/Rule';
import { RuleFormatGuide } from './RuleFormatGuide';

const JSON_BLOCK_PATTERN = /```json\n([\s\S]*?)```/g;

function exampleRules(): Rule[] {
    const ruleBlocks = [...RuleFormatGuide.text().matchAll(JSON_BLOCK_PATTERN)]
        .map(match => JSON.parse(match[1] ?? '') as Record<string, unknown>)
        .filter(block => typeof block['type'] === 'string' && block['action'] !== undefined);

    return ruleBlocks as unknown as Rule[];
}

function undocumented(names: string[]): string[] {
    const text = RuleFormatGuide.text();

    return names
        .filter(name => name !== '')
        .filter(name => !text.includes(`\`${name}\``));
}

describe('RuleFormatGuide', () => {
    test('text_WhenRead_ShouldHoldAnExampleOfEveryRuleType', () => {
        // Arrange
        const typeIds = allRuleTypes().map(type => type.id);

        // Act
        const exampleTypes = new Set(exampleRules().map(rule => rule.type));

        // Assert
        expect(typeIds.filter(typeId => !exampleTypes.has(typeId))).toEqual([]);
    });

    test('text_WhenEveryExampleIsChecked_ShouldHaveNoErrors', () => {
        // Arrange
        const rules = exampleRules();

        // Act
        const errors = rules.flatMap(rule => {
            const ruleType = RuleTypeRegistry.get(rule.type);
            const ruleErrors = ruleType?.validate(rule.action, rule.criteria) ?? ['unknown type'];

            return ruleErrors.map(error => `${rule.id}: ${error}`);
        });

        // Assert
        expect(errors).toEqual([]);
    });

    test('text_WhenEveryExampleIsImported_ShouldImportThemAll', () => {
        // Arrange
        const file = JSON.stringify({
            schemaVersion: 5,
            profiles: [
                {
                    id: 'guide-examples',
                    name: 'Guide examples',
                    rules: exampleRules(),
                    variables: [],
                },
            ],
        });

        // Act
        const parsed = ProfileTransfer.parse(file);

        // Assert
        expect(parsed.hasErrors ? parsed.error : parsed.value.profiles[0]?.rules.length)
            .toBe(exampleRules().length);
    });

    test('text_WhenRead_ShouldDocumentEveryTypeKeyAndOption', () => {
        // Arrange
        const names = allRuleTypes().flatMap(type => [
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

    test('text_WhenRead_ShouldDocumentEveryConditionOperatorAndResourceType', () => {
        // Arrange
        const names = [
            ...CRITERION_FIELDS.map(field => field.id),
            ...CRITERION_OPERATORS.map(operator => operator.id),
            ...RESOURCE_TYPE_OPTIONS.map(option => option.id),
            ...Object.values(OPERATION_KINDS),
        ];

        // Act
        const missing = undocumented(names);

        // Assert
        expect(missing).toEqual([]);
    });
});
