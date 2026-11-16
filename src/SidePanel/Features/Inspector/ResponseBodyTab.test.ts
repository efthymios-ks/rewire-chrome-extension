import { describe, expect, test } from 'vitest';
import { type SearchScope, SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { ResponseBodyTab } from './ResponseBodyTab';
import { aDetail } from '../../../TestData';
import { aPanelHarness, buttonNamed, click, nextRenderAsync } from '../../PanelTestData';

function searchingFor(scopes: SearchScope[]): PanelState {
    const state = PanelStateFactory.initial();

    return {
        ...state,
        search: {
            ...state.search,
            query: {
                text: 'ada',
                isRegex: false,
                scopes,
            },
        },
    };
}

describe('ResponseBodyTab', () => {
    test('render_WhenTheBodyWasSkipped_ShouldShowTheNote', () => {
        // Arrange
        const detail = aDetail({
            responseBody: null,
            responseBodyNote: 'Binary bodies are not captured.',
        });

        // Act
        const root = new ResponseBodyTab(aPanelHarness().context).render(
            /* detail: */ detail,
            /* state: */ PanelStateFactory.initial(),
        );

        // Assert
        expect(root.textContent).toBe('Binary bodies are not captured.');
    });

    test('render_WhenTheResponseBodyIsSearched_ShouldHighlightTheMatchesInRawText', () => {
        // Arrange
        const detail = aDetail({
            responseBody: '{"name":"Ada"}',
        });

        // Act
        const root = new ResponseBodyTab(aPanelHarness().context).render(
            /* detail: */ detail,
            /* state: */ searchingFor([SEARCH_SCOPES.ResponseBody]),
        );

        // Assert
        expect([...root.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(['Ada']);
    });

    test('render_WhenOnlyTheRequestBodyIsSearched_ShouldHighlightNothing', () => {
        // Arrange
        const detail = aDetail({
            responseBody: '{"name":"Ada"}',
        });

        // Act
        const root = new ResponseBodyTab(aPanelHarness().context).render(
            /* detail: */ detail,
            /* state: */ searchingFor([
                SEARCH_SCOPES.Url,
                SEARCH_SCOPES.RequestBody,
            ]),
        );

        // Assert
        expect(root.querySelectorAll('mark')).toHaveLength(0);
    });

    test('copy_WhenClicked_ShouldCopyTheResponseBody', async () => {
        // Arrange
        const harness = aPanelHarness();
        const detail = aDetail({
            responseBody: '{"id":42}',
        });
        const root = new ResponseBodyTab(harness.context).render(
            /* detail: */ detail,
            /* state: */ PanelStateFactory.initial(),
        );

        // Act
        click(buttonNamed(root, 'Copy response body'));
        await nextRenderAsync();

        // Assert
        expect(harness.copied).toEqual(['{"id":42}']);
    });
});
