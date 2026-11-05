import { describe, expect, test } from "vitest";
import { BrowserRuleSimulator } from "../../../../src/Background/Features/Capture/BrowserRuleSimulator";
import { RuleEngine } from "../../../../src/Contracts/Rules/RuleEngine";
import type { Rule } from "../../../../src/Contracts/Rules/Rule";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import { ChangeArea } from "../../../../src/Contracts/Rules/ValueChange";
import { aRule } from "../../../TestData";
import { activeRulesOf, aTimelineRecord } from "../../BackgroundTestData";

function headerRule(type: string, name: string): Rule {
    return aRule({
        id: name,
        name,
        type,
        criteria: {
            match: "all",
            items: [],
        },
        action: {
            operations: [
                {
                    op: "set",
                    name,
                    value: "on",
                },
            ],
        },
    });
}

describe("BrowserRuleSimulator", () => {
    test("onRequest_WhenABrowserRuleMatches_ShouldDescribeItAsABrowserChange", () => {
        // Arrange
        const simulator = new BrowserRuleSimulator(activeRulesOf([headerRule(RuleTypeIds.RequestHeader, "X-Debug")]));

        // Act
        const annotation = simulator.onRequest(aTimelineRecord());

        // Assert
        expect(annotation).toEqual({
            appliedRules: [
                {
                    ruleId: "X-Debug",
                    ruleName: "X-Debug",
                    engine: RuleEngine.Browser,
                    note: "Request header",
                },
            ],
            changes: [
                {
                    area: ChangeArea.RequestHeader,
                    name: "x-debug",
                    before: null,
                    after: "on",
                },
            ],
            isAnsweredByRule: false,
        });
    });

    test("onRequest_WhenOnlyDebuggerRulesExist_ShouldReturnNull", () => {
        // Arrange
        const simulator = new BrowserRuleSimulator(activeRulesOf([aRule()]));

        // Act
        const annotation = simulator.onRequest(aTimelineRecord());

        // Assert
        expect(annotation).toBeNull();
    });

    test("onResponse_WhenAResponseHeaderRuleMatches_ShouldDescribeTheResponseChange", () => {
        // Arrange
        const simulator = new BrowserRuleSimulator(activeRulesOf([headerRule(RuleTypeIds.ResponseHeader, "X-Frame")]));

        // Act
        const annotation = simulator.onResponse(
            aTimelineRecord(),
            200,
            []
        );

        // Assert
        expect(annotation?.changes).toEqual([
            {
                area: ChangeArea.ResponseHeader,
                name: "x-frame",
                before: null,
                after: "on",
            },
        ]);
    });

    test("onResponse_WhenInterceptionIsOff_ShouldReturnNull", () => {
        // Arrange
        const simulator = new BrowserRuleSimulator(activeRulesOf([headerRule(RuleTypeIds.ResponseHeader, "X-Frame")], false));

        // Act
        const annotation = simulator.onResponse(
            aTimelineRecord(),
            200,
            []
        );

        // Assert
        expect(annotation).toBeNull();
    });
});
