import type { CriteriaEvaluation, CriterionResult } from "../../../../Common/Rules/Criteria/CriteriaEvaluator";
import type { AppliedStep } from "../../../../Common/Rules/Engine/RulePipeline";
import { type TesterOutcome, TesterOutcomeKind, type TesterReport } from "../../../../Common/Rules/Engine/RuleTester";
import type { ValueChange } from "../../../../Contracts/Rules/ValueChange";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { ChangeAreaLabels } from "./ChangeAreaLabels";

const MaxValueLength = 120;
const NoneText = "(none)";

const ResultMarks = {
    Passed: "✓",
    Failed: "✗",
    Pending: "…",
} as const;

function markOf(result: CriterionResult): string {
    if (result.passed === null) {
        return ResultMarks.Pending;
    }

    return result.passed ? ResultMarks.Passed : ResultMarks.Failed;
}

function shorten(value: string | null): string {
    if (value === null) {
        return NoneText;
    }

    return value.length > MaxValueLength ? `${value.slice(0, MaxValueLength)}…` : value;
}

function changeLine(change: ValueChange): HTMLElement {
    return buildElement("li", {
        className: "change-line",
        children: [
            buildElement("span", {
                className: "muted",
                text: `${ChangeAreaLabels[change.area]} ${change.name}: `,
            }),
            buildElement("del", {
                text: shorten(change.before),
            }),
            " → ",
            buildElement("ins", {
                text: shorten(change.after),
            }),
        ],
    });
}

function outcomeText(outcome: TesterOutcome, delayMs: number): string {
    const wait = delayMs > 0 ? `Waits ${delayMs} ms, then ` : "";
    const texts: Record<TesterOutcomeKind, () => string> = {
        [TesterOutcomeKind.Answered]: () => `${wait}answered by a rule with ${outcome.response?.status ?? ""}.`,
        [TesterOutcomeKind.Continued]: () => `${wait}goes to ${outcome.url}${outcome.response === null ? "" : `, response ${outcome.response.status}`}.`,
    };
    const text = texts[outcome.kind]();

    return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function evaluationList(title: string, evaluation: CriteriaEvaluation | null): HTMLElement | null {
    if (evaluation === null || evaluation.results.length === 0) {
        return null;
    }

    return buildElement("div", {
        children: [
            buildElement("h4", {
                text: title,
            }),
            buildElement("ul", {
                className: "criteria-results",
                children: evaluation.results.map(result => buildElement("li", {
                    className: `criteria-result passed-${String(result.passed)}`,
                    text: `${markOf(result)} ${result.label} (${result.actual})`,
                })),
            }),
        ],
    });
}

function stepList(steps: AppliedStep[]): HTMLElement[] {
    return steps.map(step => buildElement("div", {
        className: "tester-step",
        children: [
            buildElement("strong", {
                text: step.plan.rule.name || step.plan.type?.label || step.plan.rule.type,
            }),
            step.changes.length === 0
                ? buildElement("span", {
                    className: "muted",
                    text: " matched, no visible change",
                })
                : buildElement("ul", {
                    children: step.changes.map(changeLine),
                }),
        ],
    }));
}

export const TesterReportView = {
    build(report: TesterReport): HTMLElement {
        const steps = [
            ...report.requestStage.steps,
            ...(report.responseStage?.steps ?? []),
        ];

        return buildElement("div", {
            className: "tester-report",
            attributes: {
                "aria-live": "polite",
            },
            children: [
                buildElement("p", {
                    className: `tester-outcome outcome-${report.outcome.kind}`,
                    text: outcomeText(report.outcome, report.requestStage.delayMs),
                }),
                evaluationList("Conditions before the response", report.requestEvaluation),
                report.responseEvaluation === null || report.requestEvaluation?.outcome === report.responseEvaluation.outcome
                    ? null
                    : evaluationList("Conditions with the sample response", report.responseEvaluation),
                steps.length === 0
                    ? buildElement("p", {
                        className: "muted",
                        text: "No rule changed this request.",
                    })
                    : buildElement("div", {
                        className: "tester-steps",
                        children: stepList(steps),
                    }),
            ],
        });
    },
};
