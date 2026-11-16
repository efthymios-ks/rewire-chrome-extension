import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { BodyCopyButton } from './BodyCopyButton';
import { aPanelHarness, click, nextRenderAsync } from '../../PanelTestData';

describe('BodyCopyButton', () => {
    test('build_WhenThereIsNoBody_ShouldNotOfferCopying', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const button = BodyCopyButton.build({
            context: harness.context,
            body: null,
            text: 'Copy body',
        });

        // Assert
        expect(button).toBeNull();
    });

    test('build_WhenTheBodyIsEmpty_ShouldNotOfferCopying', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const button = BodyCopyButton.build({
            context: harness.context,
            body: '',
            text: 'Copy body',
        });

        // Assert
        expect(button).toBeNull();
    });

    test('build_WhenThereIsABody_ShouldOfferAGhostButtonWithTheText', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const button = BodyCopyButton.build({
            context: harness.context,
            body: '{"id":42}',
            text: 'Copy body',
        });

        // Assert
        expect(button?.textContent).toBe('Copy body');
        expect(button?.className).toBe(BUTTON_VARIANTS.Ghost);
    });

    test('click_WhenTheClipboardAccepts_ShouldCopyTheBodyAndSaySo', async () => {
        // Arrange
        const harness = aPanelHarness();
        const button = BodyCopyButton.build({
            context: harness.context,
            body: '{"id":42}',
            text: 'Copy body',
        });

        // Act
        click(button);
        await nextRenderAsync();

        // Assert
        expect(harness.copied).toEqual(['{"id":42}']);
        expect(harness.noticeText()).toBe('Body copied.');
    });

    test('click_WhenTheClipboardRefuses_ShouldShowWhy', async () => {
        // Arrange
        const harness = aPanelHarness();
        vi.mocked(harness.context.clipboardClient.copyAsync)
            .mockResolvedValueOnce(Result.fail('Copying failed: Denied.'));
        const button = BodyCopyButton.build({
            context: harness.context,
            body: '{"id":42}',
            text: 'Copy body',
        });

        // Act
        click(button);
        await nextRenderAsync();

        // Assert
        expect(harness.noticeText()).toBe('Copying failed: Denied.');
    });
});
