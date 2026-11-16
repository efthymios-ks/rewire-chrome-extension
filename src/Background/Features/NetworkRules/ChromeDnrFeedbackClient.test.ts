import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeDnrFeedbackClient } from './ChromeDnrFeedbackClient';

type MatchedDebugListener = (info: { rule: { ruleId: number } }) => void;

function stubChrome(hasDebugEvent: boolean = true) {
    const listeners: MatchedDebugListener[] = [];
    const getMatchedRules = vi.fn().mockResolvedValue({
        rulesMatchedInfo: [],
    });
    vi.stubGlobal('chrome', {
        declarativeNetRequest: {
            onRuleMatchedDebug: hasDebugEvent
                ? {
                    addListener: (listener: MatchedDebugListener) => listeners.push(listener),
                }
                : undefined,
            getMatchedRules,
        },
    });

    return {
        getMatchedRules,
        matchDebug: (ruleId: number) => listeners.forEach(listener => listener({ rule: { ruleId } })),
    };
}

describe('ChromeDnrFeedbackClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('subscribeDebug_WhenTheDebugEventIsAvailable_ShouldForwardMatchedRuleIds', () => {
        // Arrange
        const { matchDebug } = stubChrome();
        const client = new ChromeDnrFeedbackClient();
        const listener = vi.fn();

        // Act
        const isSubscribed = client.subscribeDebug(listener);
        matchDebug(12);

        // Assert
        expect(isSubscribed).toBe(true);
        expect(listener).toHaveBeenCalledWith(12);
    });

    test('subscribeDebug_WhenTheExtensionIsNotUnpacked_ShouldReturnFalse', () => {
        // Arrange
        stubChrome(false);
        const client = new ChromeDnrFeedbackClient();

        // Act
        const isSubscribed = client.subscribeDebug(vi.fn());

        // Assert
        expect(isSubscribed).toBe(false);
    });

    test('matchedSinceAsync_WhenRulesMatched_ShouldMapThem', async () => {
        // Arrange
        const { getMatchedRules } = stubChrome();
        getMatchedRules.mockResolvedValue({
            rulesMatchedInfo: [
                {
                    rule: {
                        ruleId: 12,
                        rulesetId: '_dynamic',
                    },
                    tabId: 7,
                    timeStamp: 1_000,
                },
            ],
        });
        const client = new ChromeDnrFeedbackClient();

        // Act
        const result = await client.matchedSinceAsync(500);

        // Assert
        expect(getMatchedRules).toHaveBeenCalledWith({
            minTimeStamp: 500,
        });
        expect(result).toEqual({
            hasErrors: false,
            value: [
                {
                    dnrRuleId: 12,
                    timeStamp: 1_000,
                },
            ],
        });
    });

    test('matchedSinceAsync_WhenChromeThrottlesTheCall_ShouldFailWithTheReason', async () => {
        // Arrange
        const { getMatchedRules } = stubChrome();
        getMatchedRules.mockRejectedValue(new Error('Quota exceeded'));
        const client = new ChromeDnrFeedbackClient();

        // Act
        const result = await client.matchedSinceAsync(500);

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Quota exceeded',
        });
    });
});
