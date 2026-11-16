import { describe, expect, test } from 'vitest';
import { FetchPatternBuilder } from './FetchPatternBuilder';
import { CRITERIA_MATCHES } from '../../../Contracts/Rules/CriteriaMatches';
import { CRITERION_FIELD_IDS } from '../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { aCriterion, aRule } from '../../../TestData';
import { activeRulesOf } from '../../BackgroundTestData';

describe('FetchPatternBuilder', () => {
    test('build_WhenThereAreNoEntries_ShouldReturnNoPatterns', () => {
        // Arrange
        const entries = activeRulesOf([]).debuggerEntries();

        // Act
        const patterns = FetchPatternBuilder.build(entries);

        // Assert
        expect(patterns).toEqual([]);
    });

    test('build_WhenARequestRuleUsesDefaults_ShouldPauseFetchXhrAndDocumentRequests', () => {
        // Arrange
        const entries = activeRulesOf([aRule()]).debuggerEntries();

        // Act
        const patterns = FetchPatternBuilder.build(entries);

        // Assert
        expect(patterns).toEqual([
            {
                urlPattern: '*',
                resourceType: 'XHR',
                requestStage: 'Request',
            },
            {
                urlPattern: '*',
                resourceType: 'Fetch',
                requestStage: 'Request',
            },
            {
                urlPattern: '*',
                resourceType: 'Document',
                requestStage: 'Request',
            },
        ]);
    });

    test('build_WhenAResponseRuleExists_ShouldAddResponseStagePatterns', () => {
        // Arrange
        const rule = aRule({
            type: RULE_TYPE_IDS.MockResponse,
            action: {
                overrideStatus: true,
                status: 500,
                overrideBody: false,
            },
        });
        const entries = activeRulesOf([rule]).debuggerEntries();

        // Act
        const patterns = FetchPatternBuilder.build(entries);

        // Assert
        expect(patterns.filter(pattern => pattern.requestStage === 'Response')).toHaveLength(3);
    });

    test('build_WhenARuleExcludesAResourceType_ShouldPauseEveryType', () => {
        // Arrange
        const rule = aRule({
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.ResourceType,
                        op: CRITERION_OPERATOR_IDS.OneOf,
                        value: 'image',
                        negate: true,
                    }),
                ],
            },
        });
        const entries = activeRulesOf([rule]).debuggerEntries();

        // Act
        const patterns = FetchPatternBuilder.build(entries);

        // Assert
        expect(patterns).toEqual([
            {
                urlPattern: '*',
                requestStage: 'Request',
            },
        ]);
    });

    test('build_WhenARuleNamesDocuments_ShouldPauseOnlyDocuments', () => {
        // Arrange
        const rule = aRule({
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.ResourceType,
                        op: CRITERION_OPERATOR_IDS.OneOf,
                        value: 'document',
                    }),
                ],
            },
        });
        const entries = activeRulesOf([rule]).debuggerEntries();

        // Act
        const patterns = FetchPatternBuilder.build(entries);

        // Assert
        expect(patterns.map(pattern => pattern.resourceType)).toEqual(['Document']);
    });

    test('build_WhenARuleNamesOnlyFetch_ShouldAlsoPauseXhrBecauseChromeReportsFetchAsXhr', () => {
        // Arrange
        const rule = aRule({
            criteria: {
                match: CRITERIA_MATCHES.All,
                items: [
                    aCriterion({
                        field: CRITERION_FIELD_IDS.ResourceType,
                        op: CRITERION_OPERATOR_IDS.OneOf,
                        value: 'fetch',
                    }),
                ],
            },
        });
        const entries = activeRulesOf([rule]).debuggerEntries();

        // Act
        const patterns = FetchPatternBuilder.build(entries);

        // Assert
        expect(patterns.map(pattern => pattern.resourceType)).toEqual([
            'Fetch',
            'XHR',
        ]);
    });
});
