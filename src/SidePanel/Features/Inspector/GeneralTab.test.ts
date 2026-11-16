import { describe, expect, test } from 'vitest';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { GeneralTab } from './GeneralTab';
import { aDetail, aSummary } from '../../../TestData';
import { aPanelHarness, buttonNamed, click, nextRenderAsync } from '../../PanelTestData';

describe('GeneralTab', () => {
    test('render_WhenTheAnswerHasNoReasonPhrase_ShouldShowTheStandardOne', () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                statusCode: 404,
                statusText: '',
            }),
        });

        // Act
        const root = new GeneralTab(aPanelHarness().context).render(detail);

        // Assert
        expect(root.textContent).toContain('404 Not Found');
    });

    test('render_WhenARuleRewroteTheUrl_ShouldTagTheUrlModified', () => {
        // Arrange
        const detail = aDetail({
            changes: [
                {
                    area: CHANGE_AREA.Url,
                    name: 'url',
                    before: 'https://api.example.com/old',
                    after: 'https://api.example.com/api/v1/users/42/profile',
                },
            ],
        });

        // Act
        const root = new GeneralTab(aPanelHarness().context).render(detail);

        // Assert
        const tag = root.querySelector<HTMLElement>('.modified-tag');
        expect(tag?.parentElement?.textContent).toBe('URLModified');
        expect(tag?.title).toBe('Updated by a rule. Was: https://api.example.com/old');
    });

    test('copyUrl_WhenClicked_ShouldCopyTheFullUrl', async () => {
        // Arrange
        const harness = aPanelHarness();
        const root = new GeneralTab(harness.context).render(aDetail());

        // Act
        click(buttonNamed(root, 'Copy URL'));
        await nextRenderAsync();

        // Assert
        expect(harness.copied).toEqual(['https://api.example.com/api/v1/users/42/profile']);
        expect(harness.noticeText()).toBe('URL copied.');
    });
});
