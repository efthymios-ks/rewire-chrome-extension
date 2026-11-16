import { describe, expect, test } from 'vitest';
import { CRITERIA_OUTCOME } from '../../../../Common/Rules/Criteria/CriteriaOutcome';
import type { CriteriaEvaluation } from '../../../../Common/Rules/Criteria/CriteriaEvaluation';
import type { AppliedStep } from '../../../../Common/Rules/Engine/AppliedStep';
import { TESTER_OUTCOME_KIND } from '../../../../Common/Rules/Engine/TesterOutcomeKind';
import type { TesterReport } from '../../../../Common/Rules/Engine/TesterReport';
import { CHANGE_AREA } from '../../../../Contracts/Rules/ChangeArea';
import type { Rule } from '../../../../Contracts/Rules/Rule';
import type { ValueChange } from '../../../../Contracts/Rules/ValueChange';
import { RuleScopes } from '../RuleScopes';
import { TesterReportView } from './TesterReportView';
import { aRequestDraft, aResponseDraft, aRule, TEST_URLS } from '../../../../TestData';

function aStep(rule: Partial<Rule>, changes: ValueChange[] = []): AppliedStep {
    return {
        plan: RuleScopes.planOf(aRule(rule)),
        changes,
    };
}

function anEvaluation(overrides: Partial<CriteriaEvaluation> = {}): CriteriaEvaluation {
    return {
        outcome: CRITERIA_OUTCOME.Matched,
        results: [
            {
                label: 'URL matches */users/*',
                passed: true,
                actual: TEST_URLS.UsersProfile,
            },
        ],
        ...overrides,
    };
}

function aReport(overrides: Partial<TesterReport> = {}): TesterReport {
    return {
        requestEvaluation: null,
        responseEvaluation: null,
        requestStage: {
            draft: aRequestDraft(),
            steps: [],
            delayMs: 0,
            responseCandidates: [],
        },
        responseStage: null,
        outcome: {
            kind: TESTER_OUTCOME_KIND.Continued,
            url: TEST_URLS.UsersProfile,
            response: null,
        },
        ...overrides,
    };
}

function outcomeOf(view: HTMLElement): string {
    return view.querySelector('.tester-outcome')?.textContent ?? '';
}

function headingsOf(view: HTMLElement): string[] {
    return [...view.querySelectorAll('h4')].map(heading => heading.textContent ?? '');
}

describe('TesterReportView', () => {
    test('build_WhenNoRuleApplies_ShouldSayWhereTheRequestGoesAndThatNothingChanged', () => {
        // Arrange
        const report = aReport();

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(view.getAttribute('aria-live')).toBe('polite');
        expect(outcomeOf(view)).toBe(`Goes to ${TEST_URLS.UsersProfile}.`);
        expect(view.querySelector('.empty-note')?.textContent).toBe('No rule changed this request.');
        expect(headingsOf(view)).toEqual([]);
    });

    test('build_WhenContinuedWithASampleResponseAndADelay_ShouldMentionBoth', () => {
        // Arrange
        const report = aReport({
            requestStage: {
                ...aReport().requestStage,
                delayMs: 500,
            },
            outcome: {
                kind: TESTER_OUTCOME_KIND.Continued,
                url: TEST_URLS.Orders,
                response: {
                    status: 404,
                    headers: [],
                    body: '',
                },
            },
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(outcomeOf(view)).toBe(`Waits 500 ms, then goes to ${TEST_URLS.Orders}, response 404.`);
    });

    test.each([
        [
            0,
            'Answered by a rule with 201.',
        ],
        [
            250,
            'Waits 250 ms, then answered by a rule with 201.',
        ],
    ])('build_WhenAnsweredWithADelayOf(%s)_ShouldSay(%s)', (delayMs, text) => {
        // Arrange
        const report = aReport({
            requestStage: {
                ...aReport().requestStage,
                delayMs,
            },
            outcome: {
                kind: TESTER_OUTCOME_KIND.Answered,
                url: TEST_URLS.UsersProfile,
                response: {
                    status: 201,
                    headers: [],
                    body: '',
                },
            },
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(outcomeOf(view)).toBe(text);
    });

    test('build_WhenARuleAnswers_ShouldMarkTheOutcomeAsAnswered', () => {
        // Arrange
        const report = aReport({
            outcome: {
                kind: TESTER_OUTCOME_KIND.Answered,
                url: TEST_URLS.UsersProfile,
                response: {
                    status: 201,
                    headers: [],
                    body: '',
                },
            },
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        const outcome = view.querySelector('.tester-outcome');
        expect(outcome?.getAttribute('data-outcome')).toBe(String(TESTER_OUTCOME_KIND.Answered));
    });

    test('build_WhenConditionsWereEvaluated_ShouldMarkEachResult', () => {
        // Arrange
        const report = aReport({
            requestEvaluation: anEvaluation({
                outcome: CRITERIA_OUTCOME.Deferred,
                results: [
                    {
                        label: 'URL matches */users/*',
                        passed: true,
                        actual: 'yes',
                    },
                    {
                        label: 'Method is POST',
                        passed: false,
                        actual: 'GET',
                    },
                    {
                        label: 'Status is 500',
                        passed: null,
                        actual: 'no response yet',
                    },
                ],
            }),
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(headingsOf(view)).toEqual(['Conditions before the response']);
        expect([...view.querySelectorAll('.criteria-result')].map(result => result.textContent)).toEqual([
            '✓ URL matches */users/* (yes)',
            '✗ Method is POST (GET)',
            '… Status is 500 (no response yet)',
        ]);
        const passedMarks = [...view.querySelectorAll('.criteria-result')]
            .map(result => result.getAttribute('data-passed'));
        expect(passedMarks).toEqual([
            'true',
            'false',
            'null',
        ]);
    });

    test('build_WhenTheEvaluationHasNoResults_ShouldOmitIt', () => {
        // Arrange
        const report = aReport({
            requestEvaluation: anEvaluation({
                results: [],
            }),
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(headingsOf(view)).toEqual([]);
    });

    test('build_WhenTheSampleResponseChangesTheOutcome_ShouldListBothEvaluations', () => {
        // Arrange
        const report = aReport({
            requestEvaluation: anEvaluation({
                outcome: CRITERIA_OUTCOME.Deferred,
            }),
            responseEvaluation: anEvaluation({
                outcome: CRITERIA_OUTCOME.Matched,
            }),
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(headingsOf(view)).toEqual([
            'Conditions before the response',
            'Conditions with the sample response',
        ]);
    });

    test('build_WhenTheSampleResponseKeepsTheOutcome_ShouldListOnlyTheFirstEvaluation', () => {
        // Arrange
        const report = aReport({
            requestEvaluation: anEvaluation(),
            responseEvaluation: anEvaluation(),
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(headingsOf(view)).toEqual(['Conditions before the response']);
    });

    test('build_WhenOnlyTheResponseWasEvaluated_ShouldListIt', () => {
        // Arrange
        const report = aReport({
            responseEvaluation: anEvaluation(),
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(headingsOf(view)).toEqual(['Conditions with the sample response']);
    });

    test('build_WhenRulesChangedTheExchange_ShouldListRequestThenResponseChanges', () => {
        // Arrange
        const report = aReport({
            requestStage: {
                ...aReport().requestStage,
                steps: [
                    aStep(
                        /* rule: */ {
                            name: 'Add auth',
                        },
                        /* changes: */ [
                            {
                                area: CHANGE_AREA.RequestHeader,
                                name: 'Authorization',
                                before: null,
                                after: 'Bearer abc',
                            },
                        ],
                    ),
                ],
            },
            responseStage: {
                draft: aResponseDraft(),
                steps: [
                    aStep(
                        /* rule: */ {
                            name: 'Force 500',
                        },
                        /* changes: */ [
                            {
                                area: CHANGE_AREA.Status,
                                name: '',
                                before: '200',
                                after: '500',
                            },
                        ],
                    ),
                ],
            },
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(view.querySelector('.empty-note')).toBeNull();
        expect([...view.querySelectorAll('.tester-step strong')].map(name => name.textContent)).toEqual([
            'Add auth',
            'Force 500',
        ]);
        expect([...view.querySelectorAll('.change-line')].map(line => line.textContent)).toEqual([
            'Request header Authorization: (none) → Bearer abc',
            'Status : 200 → 500',
        ]);
    });

    test('build_WhenAStepChangedNothingVisible_ShouldSaySo', () => {
        // Arrange
        const report = aReport({
            requestStage: {
                ...aReport().requestStage,
                steps: [
                    aStep({
                        name: 'Users mock',
                    }),
                ],
            },
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(view.querySelector('.tester-step')?.textContent).toBe('Users mock matched, no visible change');
    });

    test.each([
        [
            'mockResponse',
            'Mock response',
        ],
        [
            'graphqlMock',
            'graphqlMock',
        ],
    ])('build_WhenAnUnnamedRuleOfType(%s)Applies_ShouldLabelIt(%s)', (type, label) => {
        // Arrange
        const report = aReport({
            requestStage: {
                ...aReport().requestStage,
                steps: [
                    aStep({
                        name: '',
                        type,
                    }),
                ],
            },
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(view.querySelector('.tester-step strong')?.textContent).toBe(label);
    });

    test('build_WhenAChangedValueIsLong_ShouldShortenIt', () => {
        // Arrange
        const longValue = 'x'.repeat(130);
        const report = aReport({
            requestStage: {
                ...aReport().requestStage,
                steps: [
                    aStep(
                        /* rule: */ {
                            name: 'Body',
                        },
                        /* changes: */ [
                            {
                                area: CHANGE_AREA.ResponseBody,
                                name: 'body',
                                before: longValue,
                                after: null,
                            },
                        ],
                    ),
                ],
            },
        });

        // Act
        const view = TesterReportView.build(report);

        // Assert
        expect(view.querySelector('.change-line del')?.textContent).toBe(`${'x'.repeat(120)}…`);
        expect(view.querySelector('.change-line ins')?.textContent).toBe('(none)');
    });
});
