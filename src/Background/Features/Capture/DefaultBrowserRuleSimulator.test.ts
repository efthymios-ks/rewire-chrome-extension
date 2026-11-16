import { describe, expect, test } from 'vitest';
import { DefaultBrowserRuleSimulator } from './DefaultBrowserRuleSimulator';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { RULE_ENGINE } from '../../../Contracts/Rules/RuleEngine';
import type { Rule } from '../../../Contracts/Rules/Rule';
import { RULE_TYPE_IDS } from '../../../Contracts/Rules/RuleTypeId';
import { aRule } from '../../../TestData';
import { activeRulesOf, aTimelineRecord } from '../../BackgroundTestData';

function headerRule(type: string, name: string): Rule {
    return aRule({
        id: name,
        name,
        type,
        criteria: {
            match: 'all',
            items: [],
        },
        action: {
            operations: [
                {
                    op: 'set',
                    name,
                    value: 'on',
                },
            ],
        },
    });
}

describe('DefaultBrowserRuleSimulator', () => {
    test('simulateRequest_WhenABrowserRuleMatches_ShouldDescribeItAsABrowserChange', () => {
        // Arrange
        const rules = [headerRule(RULE_TYPE_IDS.RequestHeader, 'X-Debug')];
        const simulator = new DefaultBrowserRuleSimulator(activeRulesOf(rules));

        // Act
        const annotation = simulator.simulateRequest(aTimelineRecord());

        // Assert
        expect(annotation).toEqual({
            appliedRules: [
                {
                    ruleId: 'X-Debug',
                    ruleName: 'X-Debug',
                    engine: RULE_ENGINE.Browser,
                    note: 'Request header',
                },
            ],
            changes: [
                {
                    area: CHANGE_AREA.RequestHeader,
                    name: 'x-debug',
                    before: null,
                    after: 'on',
                },
            ],
            isAnsweredByRule: false,
        });
    });

    test('simulateRequest_WhenOnlyDebuggerRulesExist_ShouldReturnNull', () => {
        // Arrange
        const simulator = new DefaultBrowserRuleSimulator(activeRulesOf([aRule()]));

        // Act
        const annotation = simulator.simulateRequest(aTimelineRecord());

        // Assert
        expect(annotation).toBeNull();
    });

    test('simulateResponse_WhenAResponseHeaderRuleMatches_ShouldDescribeTheResponseChange', () => {
        // Arrange
        const rules = [headerRule(RULE_TYPE_IDS.ResponseHeader, 'X-Frame')];
        const simulator = new DefaultBrowserRuleSimulator(activeRulesOf(rules));

        // Act
        const annotation = simulator.simulateResponse({
            record: aTimelineRecord(),
            status: 200,
            headers: [],
        });

        // Assert
        expect(annotation?.changes).toEqual([
            {
                area: CHANGE_AREA.ResponseHeader,
                name: 'x-frame',
                before: null,
                after: 'on',
            },
        ]);
    });

    test('simulateResponse_WhenInterceptionIsOff_ShouldReturnNull', () => {
        // Arrange
        const rules = [headerRule(RULE_TYPE_IDS.ResponseHeader, 'X-Frame')];
        const simulator = new DefaultBrowserRuleSimulator(activeRulesOf(rules, false));

        // Act
        const annotation = simulator.simulateResponse({
            record: aTimelineRecord(),
            status: 200,
            headers: [],
        });

        // Assert
        expect(annotation).toBeNull();
    });
});
