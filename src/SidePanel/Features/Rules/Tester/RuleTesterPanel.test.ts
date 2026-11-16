import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { TesterInput } from '../../../../Common/Rules/Engine/TesterInput';
import { TESTER_OUTCOME_KIND } from '../../../../Common/Rules/Engine/TesterOutcomeKind';
import type { TesterReport } from '../../../../Common/Rules/Engine/TesterReport';
import { PANEL_LIMITS } from '../../../Core/PanelLimits';
import { RuleTesterPanel } from './RuleTesterPanel';
import { aRequestDraft, TEST_URLS } from '../../../../TestData';
import { typeInto } from '../../../PanelTestData';

function aRunner() {
    return vi.fn((input: TesterInput): TesterReport => ({
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
            url: input.url,
            response: null,
        },
    }));
}

function outcomeOf(panel: RuleTesterPanel): string {
    return panel.root.querySelector('.tester-output .tester-outcome')?.textContent ?? '';
}

function urlInputOf(panel: RuleTesterPanel): HTMLInputElement {
    return panel.root.querySelector<HTMLInputElement>('.tester-form input')!;
}

describe('RuleTesterPanel', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('constructor_WhenBuilt_ShouldRunTheSampleUrlRightAway', () => {
        // Arrange
        const runner = aRunner();

        // Act
        const panel = new RuleTesterPanel(TEST_URLS.UsersProfile, runner);

        // Assert
        expect(runner).toHaveBeenCalledTimes(1);
        expect(runner.mock.calls[0]?.[0].url).toBe(TEST_URLS.UsersProfile);
        expect(urlInputOf(panel).value).toBe(TEST_URLS.UsersProfile);
        expect(outcomeOf(panel)).toBe(`Goes to ${TEST_URLS.UsersProfile}.`);
    });

    test('refresh_WhenCalledRepeatedly_ShouldRunOnceAfterTheDebounce', () => {
        // Arrange
        const runner = aRunner();
        const panel = new RuleTesterPanel(TEST_URLS.UsersProfile, runner);
        panel.refresh();
        panel.refresh();

        // Act
        vi.advanceTimersByTime(PANEL_LIMITS.TesterDebounceInMilliseconds - 1);
        const callsBeforeDebounce = runner.mock.calls.length;
        panel.refresh();
        vi.advanceTimersByTime(PANEL_LIMITS.TesterDebounceInMilliseconds);

        // Assert
        expect(callsBeforeDebounce).toBe(1);
        expect(runner).toHaveBeenCalledTimes(2);
    });

    test('form_WhenTheUrlIsTyped_ShouldRerunWithItAfterTheDebounce', () => {
        // Arrange
        const runner = aRunner();
        const panel = new RuleTesterPanel(TEST_URLS.UsersProfile, runner);
        typeInto(urlInputOf(panel), TEST_URLS.Orders);

        // Act
        vi.advanceTimersByTime(PANEL_LIMITS.TesterDebounceInMilliseconds);

        // Assert
        expect(runner).toHaveBeenCalledTimes(2);
        expect(runner.mock.calls[1]?.[0].url).toBe(TEST_URLS.Orders);
        expect(outcomeOf(panel)).toBe(`Goes to ${TEST_URLS.Orders}.`);
    });
});
