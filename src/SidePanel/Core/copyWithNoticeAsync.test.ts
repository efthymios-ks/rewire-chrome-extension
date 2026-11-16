import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../Common/Results/Result';
import { copyWithNoticeAsync } from './copyWithNoticeAsync';
import { aPanelHarness } from '../PanelTestData';

describe('copyWithNoticeAsync', () => {
    test('copyWithNoticeAsync_WhenTheClipboardAccepts_ShouldCopyTheTextAndSayItWorked', async () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        await copyWithNoticeAsync({
            context: harness.context,
            text: 'curl https://api.example.com',
            successMessage: 'Snippet copied.',
        });

        // Assert
        expect(harness.copied).toEqual(['curl https://api.example.com']);
        expect(harness.noticeText()).toBe('Snippet copied.');
    });

    test('copyWithNoticeAsync_WhenTheClipboardRefuses_ShouldShowWhy', async () => {
        // Arrange
        const harness = aPanelHarness();
        vi.mocked(harness.context.clipboardClient.copyAsync)
            .mockResolvedValueOnce(Result.fail('Copying failed: denied'));

        // Act
        await copyWithNoticeAsync({
            context: harness.context,
            text: 'token',
            successMessage: 'Snippet copied.',
        });

        // Assert
        expect(harness.noticeText()).toBe('Copying failed: denied');
    });
});
