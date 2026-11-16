import { describe, expect, test } from 'vitest';
import { CHANGE_AREA } from '../../../Contracts/Rules/ChangeArea';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { TextBodyView } from './TextBodyView';
import { aDetail } from '../../../TestData';
import { aPanelHarness, buttonNamed, click, nextRenderAsync } from '../../PanelTestData';

describe('TextBodyView', () => {
    test('build_WhenThereIsABody_ShouldOfferToCopyItAboveTheBody', async () => {
        // Arrange
        const harness = aPanelHarness();
        const root = TextBodyView.build({
            context: harness.context,
            detail: aDetail(),
            state: PanelStateFactory.initial(),
            body: 'plain text',
            note: null,
            area: CHANGE_AREA.ResponseBody,
            searchScope: SEARCH_SCOPES.ResponseBody,
            copyText: 'Copy the body',
        });

        // Act
        click(buttonNamed(root, 'Copy the body'));
        await nextRenderAsync();

        // Assert
        expect(root.className).toBe('body-tab');
        expect(root.querySelector('.body-view')?.textContent).toContain('plain text');
        expect(harness.copied).toEqual(['plain text']);
    });

    test('build_WhenThereIsNoBody_ShouldShowOnlyTheNote', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const root = TextBodyView.build({
            context: harness.context,
            detail: aDetail(),
            state: PanelStateFactory.initial(),
            body: null,
            note: 'Binary bodies are not captured.',
            area: CHANGE_AREA.RequestBody,
            searchScope: SEARCH_SCOPES.RequestBody,
            copyText: 'Copy the body',
        });

        // Assert
        expect(root.querySelector('button')).toBeNull();
        expect(root.textContent).toBe('Binary bodies are not captured.');
    });
});
