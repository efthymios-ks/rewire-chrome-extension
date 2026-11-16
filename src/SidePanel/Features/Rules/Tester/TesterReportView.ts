import type { CriteriaEvaluation } from '../../../../Common/Rules/Criteria/CriteriaEvaluation';
import type { CriterionResult } from '../../../../Common/Rules/Criteria/CriterionResult';
import type { AppliedStep } from '../../../../Common/Rules/Engine/AppliedStep';
import type { TesterOutcome } from '../../../../Common/Rules/Engine/TesterOutcome';
import { TESTER_OUTCOME_KIND, type TesterOutcomeKind } from '../../../../Common/Rules/Engine/TesterOutcomeKind';
import type { TesterReport } from '../../../../Common/Rules/Engine/TesterReport';
import type { ValueChange } from '../../../../Contracts/Rules/ValueChange';
import { buildElement } from '../../../Core/Dom/buildElement';
import { CHANGE_AREA_LABELS } from './ChangeAreaLabels';

const MAX_VALUE_LENGTH = 120;
const NONE_TEXT = '(none)';

const RESULT_MARKS = Object.freeze({
    Passed: '✓',
    Failed: '✗',
    Pending: '…',
} as const);

function markOf(result: CriterionResult): string {
    if (result.passed == null) {
        return RESULT_MARKS.Pending;
    }

    return result.passed ? RESULT_MARKS.Passed : RESULT_MARKS.Failed;
}

function shorten(value: string | null): string {
    if (value == null) {
        return NONE_TEXT;
    }

    return value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value;
}

function changeLine(change: ValueChange): HTMLElement {
    return buildElement('li', {
        className: 'change-line',
        children: [
            buildElement('span', {
                className: 'change-label',
                text: `${CHANGE_AREA_LABELS[change.area]} ${change.name}: `,
            }),
            buildElement('del', {
                text: shorten(change.before),
            }),
            ' → ',
            buildElement('ins', {
                text: shorten(change.after),
            }),
        ],
    });
}

function outcomeText(outcome: TesterOutcome, delayMs: number): string {
    const wait = delayMs > 0 ? `Waits ${delayMs} ms, then ` : '';
    const responseStatus = outcome.response?.status ?? '';
    const responseSuffix = outcome.response == null ? '' : `, response ${outcome.response.status}`;
    const texts: Record<TesterOutcomeKind, () => string> = {
        [TESTER_OUTCOME_KIND.Answered]: () => `${wait}answered by a rule with ${responseStatus}.`,
        [TESTER_OUTCOME_KIND.Continued]: () => `${wait}goes to ${outcome.url}${responseSuffix}.`,
    };
    const text = texts[outcome.kind]();

    return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function evaluationList(title: string, evaluation: CriteriaEvaluation | null): HTMLElement | null {
    if (evaluation == null || evaluation.results.length === 0) {
        return null;
    }

    return buildElement('div', {
        children: [
            buildElement('h4', {
                text: title,
            }),
            buildElement('ul', {
                className: 'criteria-results',
                children: evaluation.results.map(result => buildElement('li', {
                    className: 'criteria-result',
                    text: `${markOf(result)} ${result.label} (${result.actual})`,
                    attributes: {
                        'data-passed': String(result.passed),
                    },
                })),
            }),
        ],
    });
}

function stepLabelOf(step: AppliedStep): string {
    if (step.plan.rule.name !== '') {
        return step.plan.rule.name;
    }

    const typeLabel = step.plan.type?.label ?? '';

    return typeLabel === '' ? step.plan.rule.type : typeLabel;
}

function stepList(steps: AppliedStep[]): HTMLElement[] {
    return steps.map(step => buildElement('div', {
        className: 'tester-step',
        children: [
            buildElement('strong', {
                text: stepLabelOf(step),
            }),
            step.changes.length === 0
                ? buildElement('span', {
                    className: 'step-note',
                    text: ' matched, no visible change',
                })
                : buildElement('ul', {
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
        const { responseEvaluation } = report;
        const isResponseEvaluationRedundant = responseEvaluation == null
            || report.requestEvaluation?.outcome === responseEvaluation.outcome;

        return buildElement('div', {
            className: 'tester-report',
            attributes: {
                'aria-live': 'polite',
            },
            children: [
                buildElement('p', {
                    className: 'tester-outcome',
                    text: outcomeText(report.outcome, report.requestStage.delayMs),
                    attributes: {
                        'data-outcome': String(report.outcome.kind),
                    },
                }),
                evaluationList('Conditions before the response', report.requestEvaluation),
                isResponseEvaluationRedundant
                    ? null
                    : evaluationList('Conditions with the sample response', responseEvaluation),
                steps.length === 0
                    ? buildElement('p', {
                        className: 'empty-note',
                        text: 'No rule changed this request.',
                    })
                    : buildElement('div', {
                        className: 'tester-steps',
                        children: stepList(steps),
                    }),
            ],
        });
    },
};
