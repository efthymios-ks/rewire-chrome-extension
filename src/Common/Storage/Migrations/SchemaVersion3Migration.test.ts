import { describe, expect, test } from 'vitest';
import { SchemaVersion3Migration } from './SchemaVersion3Migration';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';

type RawRecord = Record<string, unknown>;

function aStoredRule(overrides: RawRecord = {}): RawRecord {
    return {
        id: 'rule-1',
        name: 'Rule',
        enabled: true,
        type: RULE_TYPE_IDS.RequestHeader,
        criteria: {
            match: 'all',
            items: [],
        },
        action: {},
        ...overrides,
    };
}

describe('SchemaVersion3Migration', () => {
    test('migrate_WhenRedirectHasNoStatus_ShouldBecomeRewrite', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'redirect',
            action: {
                target: 'http://localhost:5000/users',
                status: 0,
            },
        });

        // Act
        const migrated = SchemaVersion3Migration.migrate([rule]);

        // Assert
        expect(migrated[0]).toMatchObject({
            type: RULE_TYPE_IDS.Rewrite,
            action: {
                target: 'http://localhost:5000/users',
            },
        });
        expect(migrated[0]?.['action']).not.toHaveProperty('status');
    });

    test('migrate_WhenRedirectHasAThreeDigitStatus_ShouldStayRedirect', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'redirect',
            action: {
                target: 'https://example.com/moved',
                status: 301,
            },
        });

        // Act
        const migrated = SchemaVersion3Migration.migrate([rule]);

        // Assert
        expect(migrated[0]).toMatchObject({
            type: RULE_TYPE_IDS.Redirect,
            action: {
                target: 'https://example.com/moved',
                status: 301,
            },
        });
    });

    test('migrate_WhenEnvironmentMirror_ShouldBecomeRewriteWithPathSuffixRegex', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'environmentMirror',
            criteria: {
                match: 'all',
                items: [],
            },
            action: {
                sourceBase: 'https://api.example.com/',
                targetBase: 'http://localhost:5000',
            },
        });

        // Act
        const [migrated] = SchemaVersion3Migration.migrate([rule]);

        // Assert
        expect(migrated).toMatchObject({
            type: RULE_TYPE_IDS.Rewrite,
            action: {
                target: 'http://localhost:5000$1',
            },
        });
        const criteria = migrated!['criteria'] as RawRecord;
        const items = criteria['items'] as RawRecord[];
        expect(items).toEqual([
            {
                field: 'url',
                op: 'regex',
                name: '',
                value: '^https://api\\.example\\.com((?:[/?#].*)?)$',
                negate: false,
            },
        ]);
    });

    test('migrate_WhenMirrorKeepsExistingCriteria_ShouldAppendTheRegexCondition', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'environmentMirror',
            criteria: {
                match: 'all',
                items: [
                    {
                        field: 'method',
                        op: 'oneOf',
                        name: '',
                        value: 'GET',
                        negate: false,
                    },
                ],
            },
            action: {
                sourceBase: 'https://api.example.com',
                targetBase: 'http://localhost:5000',
            },
        });

        // Act
        const [migrated] = SchemaVersion3Migration.migrate([rule]);

        // Assert
        const items = (migrated!['criteria'] as RawRecord)['items'] as RawRecord[];
        expect(items.map(item => item['field'])).toEqual([
            'method',
            'url',
        ]);
    });

    test('migrate_WhenMirrorHasNoSource_ShouldSkipTheExtraCriterion', () => {
        // Arrange
        const rule = aStoredRule({
            type: 'environmentMirror',
            action: {
                sourceBase: '',
                targetBase: 'http://localhost:5000',
            },
        });

        // Act
        const [migrated] = SchemaVersion3Migration.migrate([rule]);

        // Assert
        const items = (migrated!['criteria'] as RawRecord)['items'] as RawRecord[];
        expect(items).toEqual([]);
        expect(migrated).toMatchObject({
            type: RULE_TYPE_IDS.Rewrite,
            action: {
                target: 'http://localhost:5000$1',
            },
        });
    });

    test('migrate_WhenOtherTypes_ShouldLeaveThemAlone', () => {
        // Arrange
        const rule = aStoredRule({
            type: RULE_TYPE_IDS.RequestHeader,
            action: {
                operations: [
                    {
                        op: 'addOrUpdate',
                        name: 'X-Env',
                        value: 'staging',
                    },
                ],
            },
        });

        // Act
        const [migrated] = SchemaVersion3Migration.migrate([rule]);

        // Assert
        expect(migrated).toEqual(rule);
    });
});
