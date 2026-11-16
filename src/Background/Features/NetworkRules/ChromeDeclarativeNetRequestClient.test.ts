import { afterEach, describe, expect, test, vi } from 'vitest';
import { ChromeDeclarativeNetRequestClient } from './ChromeDeclarativeNetRequestClient';
import type { RegexSupportClient } from '../../../Common/NetworkRules/RegexSupportClient';
import { Result } from '../../../Common/Results/Result';

function aDnrRule(id: number): chrome.declarativeNetRequest.Rule {
    return {
        id,
        priority: 1,
        action: {
            type: 'block' as chrome.declarativeNetRequest.RuleActionType,
        },
        condition: {
            urlFilter: '*/api/v1/users/*',
        },
    };
}

function stubChrome(existing: chrome.declarativeNetRequest.Rule[] = []) {
    const getDynamicRules = vi.fn().mockResolvedValue(existing);
    const updateDynamicRules = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
        declarativeNetRequest: {
            getDynamicRules,
            updateDynamicRules,
        },
    });

    return {
        getDynamicRules,
        updateDynamicRules,
    };
}

function createRegexSupportClient(result: Result<void> = Result.done()): RegexSupportClient {
    return {
        checkAsync: vi.fn().mockResolvedValue(result),
    };
}

describe('ChromeDeclarativeNetRequestClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('replaceAllAsync_WhenRulesExist_ShouldRemoveThemAndAddTheNewOnes', async () => {
        // Arrange
        const { updateDynamicRules } = stubChrome([aDnrRule(1), aDnrRule(2)]);
        const client = new ChromeDeclarativeNetRequestClient(createRegexSupportClient());

        // Act
        const result = await client.replaceAllAsync([aDnrRule(3)]);

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: undefined,
        });
        expect(updateDynamicRules).toHaveBeenCalledWith({
            removeRuleIds: [1, 2],
            addRules: [aDnrRule(3)],
        });
    });

    test('replaceAllAsync_WhenChromeRejectsTheRules_ShouldFailWithTheReason', async () => {
        // Arrange
        const { updateDynamicRules } = stubChrome();
        updateDynamicRules.mockRejectedValue(new Error('Rule with id 3 is invalid'));
        const client = new ChromeDeclarativeNetRequestClient(createRegexSupportClient());

        // Act
        const result = await client.replaceAllAsync([aDnrRule(3)]);

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Rule with id 3 is invalid',
        });
    });

    test('replaceAllAsync_WhenReadingTheExistingRulesFails_ShouldFailWithoutUpdating', async () => {
        // Arrange
        const { getDynamicRules, updateDynamicRules } = stubChrome();
        getDynamicRules.mockRejectedValue(new Error('Extension context invalidated'));
        const client = new ChromeDeclarativeNetRequestClient(createRegexSupportClient());

        // Act
        const result = await client.replaceAllAsync([]);

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Extension context invalidated',
        });
        expect(updateDynamicRules).not.toHaveBeenCalled();
    });

    test('removeAllAsync_WhenRulesExist_ShouldRemoveThemAll', async () => {
        // Arrange
        const { updateDynamicRules } = stubChrome([aDnrRule(1)]);
        const client = new ChromeDeclarativeNetRequestClient(createRegexSupportClient());

        // Act
        const result = await client.removeAllAsync();

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(updateDynamicRules).toHaveBeenCalledWith({
            removeRuleIds: [1],
            addRules: [],
        });
    });

    test('addAsync_WhenChromeAcceptsTheRule_ShouldAddOnlyThatRule', async () => {
        // Arrange
        const { getDynamicRules, updateDynamicRules } = stubChrome([aDnrRule(1)]);
        const client = new ChromeDeclarativeNetRequestClient(createRegexSupportClient());

        // Act
        const result = await client.addAsync(aDnrRule(2));

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(getDynamicRules).not.toHaveBeenCalled();
        expect(updateDynamicRules).toHaveBeenCalledWith({
            addRules: [aDnrRule(2)],
        });
    });

    test('addAsync_WhenChromeRejectsTheRule_ShouldFailWithTheReason', async () => {
        // Arrange
        const { updateDynamicRules } = stubChrome();
        updateDynamicRules.mockRejectedValue('Rule with id 2 already exists');
        const client = new ChromeDeclarativeNetRequestClient(createRegexSupportClient());

        // Act
        const result = await client.addAsync(aDnrRule(2));

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'Rule with id 2 already exists',
        });
    });

    test('checkRegexAsync_WhenCalled_ShouldAskTheRegexSupportClient', async () => {
        // Arrange
        const regexSupportClient = createRegexSupportClient(Result.fail('Regex is too large'));
        const client = new ChromeDeclarativeNetRequestClient(regexSupportClient);

        // Act
        const result = await client.checkRegexAsync('^(a+)+$');

        // Assert
        expect(regexSupportClient.checkAsync).toHaveBeenCalledWith('^(a+)+$');
        expect(result).toEqual({
            hasErrors: true,
            error: 'Regex is too large',
        });
    });
});
