import { describe, expect, test } from "vitest";
import { TimelineAnnotations } from "../../../../src/Background/Features/Capture/TimelineAnnotations";
import type { AppliedRule } from "../../../../src/Contracts/Rules/AppliedRule";
import { RuleEngine } from "../../../../src/Contracts/Rules/RuleEngine";
import { ChangeArea } from "../../../../src/Contracts/Rules/ValueChange";
import type { TimelineAnnotation } from "../../../../src/Contracts/Timeline/TimelineAnnotation";
import { aSummary } from "../../../TestData";
import { aTimelineRecord } from "../../BackgroundTestData";

function anAppliedRule(ruleId: string): AppliedRule {
    return {
        ruleId,
        ruleName: `Rule ${ruleId}`,
        engine: RuleEngine.Debugger,
        note: "Request header",
    };
}

function anAnnotation(overrides: Partial<TimelineAnnotation> = {}): TimelineAnnotation {
    return {
        appliedRules: [],
        changes: [],
        isAnsweredByRule: false,
        ...overrides,
    };
}

describe("TimelineAnnotations", () => {
    test("applyTo_WhenTheRuleIsAlreadyListed_ShouldListItOnceAndKeepTheChanges", () => {
        // Arrange
        const record = aTimelineRecord({
            summary: aSummary({
                appliedRules: [
                    anAppliedRule("rule-1"),
                ],
            }),
        });
        const annotation = anAnnotation({
            appliedRules: [
                anAppliedRule("rule-1"),
                anAppliedRule("rule-2"),
            ],
            changes: [
                {
                    area: ChangeArea.RequestHeader,
                    name: "x-debug",
                    before: null,
                    after: "1",
                },
            ],
        });

        // Act
        const annotated = TimelineAnnotations.applyTo(record, annotation);

        // Assert
        expect(annotated.summary.appliedRules.map(rule => rule.ruleId)).toEqual([
            "rule-1",
            "rule-2",
        ]);
        expect(annotated.changes).toHaveLength(1);
    });

    test("applyTo_WhenTheAnnotationAddsNothing_ShouldReturnTheSameRecord", () => {
        // Arrange
        const record = aTimelineRecord();

        // Act
        const annotated = TimelineAnnotations.applyTo(record, anAnnotation());

        // Assert
        expect(annotated).toBe(record);
    });

    test("applyTo_WhenARuleAnsweredTheCall_ShouldMarkItAnswered", () => {
        // Arrange
        const annotation = anAnnotation({
            isAnsweredByRule: true,
        });

        // Act
        const annotated = TimelineAnnotations.applyTo(aTimelineRecord(), annotation);

        // Assert
        expect(annotated.summary.isAnsweredByRule).toBe(true);
    });

    test.each([
        [
            "no rule activity",
            {},
            false,
        ],
        [
            "an applied rule",
            {
                appliedRules: [
                    anAppliedRule("rule-1"),
                ],
            },
            true,
        ],
        [
            "a redirect",
            {
                redirectedFromUrl: "https://api.example.com/original",
            },
            true,
        ],
    ])("isTouchedByRule_WhenTheRecordHas(%s)_ShouldReturn(%s)", (
        _case,
        summary,
        expected
    ) => {
        // Arrange
        const record = aTimelineRecord({
            summary: aSummary(summary),
        });

        // Act
        const touched = TimelineAnnotations.isTouchedByRule(record);

        // Assert
        expect(touched).toBe(expected);
    });
});
