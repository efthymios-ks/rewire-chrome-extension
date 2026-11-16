import { describe, expect, test } from 'vitest';
import { type SearchScope, SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { RequestBodyTab } from './RequestBodyTab';
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

describe('RequestBodyTab', () => {
    test.each<[SearchScope[], string[]]>([
        [
            [SEARCH_SCOPES.RequestBody],
            ['Ada'],
        ],
        [
            [
                SEARCH_SCOPES.Url,
                SEARCH_SCOPES.ResponseBody,
            ],
            [],
        ],
    ])('render_WhenSearchingIn(%s)_ShouldHighlightOnlyForTheRequestBodyArea', (scopes, expected) => {
        // Arrange
        const detail = aDetail({
            requestBody: '{"name":"Ada"}',
        });

        // Act
        const root = new RequestBodyTab(aPanelHarness().context).render(
            /* detail: */ detail,
            /* state: */ searchingFor(scopes),
        );

        // Assert
        expect([...root.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(expected);
    });

    test('render_WhenThereIsNoBody_ShouldSaySoWithoutACopyButton', () => {
        // Arrange
        const detail = aDetail({
            requestBody: null,
        });

        // Act
        const root = new RequestBodyTab(aPanelHarness().context).render(
            /* detail: */ detail,
            /* state: */ PanelStateFactory.initial(),
        );

        // Assert
        expect(root.textContent).toBe('No body.');
        expect(root.querySelector('button')).toBeNull();
    });

    test('copy_WhenClicked_ShouldCopyTheRequestBody', async () => {
        // Arrange
        const harness = aPanelHarness();
        const detail = aDetail({
            requestBody: '{"name":"Ada"}',
        });
        const root = new RequestBodyTab(harness.context).render(
            /* detail: */ detail,
            /* state: */ PanelStateFactory.initial(),
        );

        // Act
        click(buttonNamed(root, 'Copy request body'));
        await nextRenderAsync();

        // Assert
        expect(harness.copied).toEqual(['{"name":"Ada"}']);
        expect(harness.noticeText()).toBe('Body copied.');
    });

    test('render_WhenTheBodyWasDecompressed_ShouldShowTheNoteAboveTheText', () => {
        // Arrange
        const detail = aDetail({
            requestBody: '{"page":"home"}',
            requestBodyNote: 'Decompressed from gzip (35 bytes → 15 bytes).',
        });

        // Act
        const root = new RequestBodyTab(aPanelHarness().context).render(
            /* detail: */ detail,
            /* state: */ PanelStateFactory.initial(),
        );

        // Assert
        const note = root.querySelector('.help-text');
        expect(note?.textContent).toBe('Decompressed from gzip (35 bytes → 15 bytes).');
        expect(root.textContent).toContain('page');
        expect(buttonNamed(root, 'Copy request body')).not.toBeNull();
    });

    test('render_WhenTheBodyIsBinary_ShouldShowTheNoteAndAHexDumpInsteadOfText', () => {
        // Arrange
        const detail = aDetail({
            requestBody: null,
            requestBodyNote: 'Binary body · 4 bytes.',
            requestBodyBase64: 'AP+ACg==',
        });

        // Act
        const root = new RequestBodyTab(aPanelHarness().context).render(
            /* detail: */ detail,
            /* state: */ PanelStateFactory.initial(),
        );

        // Assert
        expect(root.querySelector('.help-text')?.textContent).toBe('Binary body · 4 bytes.');
        expect(root.querySelector('[aria-label="Hex dump"]')?.textContent)
            .toBe(`00000000  00 ff 80 0a${' '.repeat(39)}|....|`);
        expect(root.textContent).not.toContain('No body.');
        expect(root.querySelector('select')).toBeNull();
    });

    test('copy_WhenCopyAsBase64IsClicked_ShouldCopyTheBytesAsBase64', async () => {
        // Arrange
        const harness = aPanelHarness();
        const detail = aDetail({
            requestBody: null,
            requestBodyNote: 'Binary body · 4 bytes.',
            requestBodyBase64: 'AP+ACg==',
        });
        const root = new RequestBodyTab(harness.context).render(
            /* detail: */ detail,
            /* state: */ PanelStateFactory.initial(),
        );

        // Act
        click(buttonNamed(root, 'Copy as base64'));
        await nextRenderAsync();

        // Assert
        expect(harness.copied).toEqual(['AP+ACg==']);
        expect(harness.noticeText()).toBe('Body copied.');
    });
});
