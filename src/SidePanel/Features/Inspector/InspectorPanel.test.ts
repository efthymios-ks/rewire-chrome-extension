import { afterEach, describe, expect, test } from 'vitest';
import { SEARCH_FIELDS } from '../../../Contracts/Search/SearchField';
import { InspectorPanel } from './InspectorPanel';
import { aDetail, aSummary } from '../../../TestData';
import { aPanelHarness, buttonNamed, click, nextRenderAsync } from '../../PanelTestData';

function aSelectedHarness(): ReturnType<typeof aPanelHarness> {
    const summary = aSummary({
        id: 'request-1',
    });

    return aPanelHarness({
        entries: [summary],
        selectedEntryId: 'request-1',
        selectedEntryDetail: aDetail({
            summary,
        }),
    });
}

function rightClick(element: Element): MouseEvent {
    const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(event);

    return event;
}

describe('InspectorPanel', () => {
    afterEach(async () => {
        await nextRenderAsync();
        document.body.replaceChildren();
        window.getSelection()?.removeAllRanges();
    });

    test('constructor_WhenBuilt_ShouldOfferOneTabPerPartOfTheCall', () => {
        // Arrange
        const harness = aSelectedHarness();

        // Act
        const panel = new InspectorPanel(harness.context);

        // Assert
        const tabLabels = [...panel.root.querySelectorAll(':scope > .inspector-tabs .tab')]
            .map(tab => tab.textContent);
        expect(tabLabels).toEqual([
            'General',
            'Request Headers',
            'Request Body',
            'Response Headers',
            'Response Body',
            'Code',
        ]);
    });

    test('render_WhenATabIsPicked_ShouldShowOnlyThatPart', async () => {
        // Arrange
        const harness = aSelectedHarness();
        const panel = new InspectorPanel(harness.context);
        await nextRenderAsync();

        // Act
        click(buttonNamed(panel.root, 'Response Body'));
        await nextRenderAsync();

        // Assert
        expect(panel.root.querySelector('.inspector-body .body-tab')).not.toBeNull();
        expect(panel.root.querySelector('.inspector-body .general-tab')).toBeNull();
        expect(buttonNamed(panel.root, 'Response Body').getAttribute('aria-selected')).toBe('true');
    });

    test('render_WhenAReloadOfTheShownCallFailsAndATabIsPicked_ShouldKeepShowingTheCall', async () => {
        // Arrange
        const harness = aSelectedHarness();
        const panel = new InspectorPanel(harness.context);
        await nextRenderAsync();
        harness.store.update(state => ({
            ...state,
            detailError: 'The call is gone.',
        }));
        await nextRenderAsync();

        // Act
        click(buttonNamed(panel.root, 'Response Body'));
        await nextRenderAsync();

        // Assert
        expect(panel.root.querySelector('.inspector-body .body-tab')).not.toBeNull();
        expect(panel.root.querySelector('.inspector-body')?.textContent).not.toContain('The call is gone.');
    });

    test('render_WhenTheSelectedCallFailedToLoad_ShouldShowTheError', async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [
                aSummary({
                    id: 'request-1',
                }),
                aSummary({
                    id: 'request-2',
                }),
            ],
            selectedEntryId: 'request-2',
            selectedEntryDetail: aDetail({
                summary: aSummary({
                    id: 'request-1',
                }),
            }),
            detailError: 'The call is gone.',
        });

        // Act
        const panel = new InspectorPanel(harness.context);
        await nextRenderAsync();

        // Assert
        expect(panel.root.querySelector('.inspector-body')?.textContent).toBe('The call is gone.');
    });

    test('render_WhenASearchMatchesTheSelectedCall_ShouldMarkTheTabsThatHoldIt', async () => {
        // Arrange
        const harness = aSelectedHarness();
        harness.store.update(state => ({
            ...state,
            search: {
                ...state.search,
                matches: [
                    {
                        entryId: 'request-1',
                        fields: [
                            SEARCH_FIELDS.Url,
                            SEARCH_FIELDS.ResponseBody,
                        ],
                        count: 2,
                    },
                ],
            },
        }));

        // Act
        const panel = new InspectorPanel(harness.context);
        await nextRenderAsync();

        // Assert
        expect([...panel.root.querySelectorAll('.tab[data-match]')].map(tab => tab.textContent)).toEqual([
            'General',
            'Response Body',
        ]);
    });

    test('render_WhenOnlyTheQueryMatches_ShouldMarkTheGeneralTab', async () => {
        // Arrange
        const harness = aSelectedHarness();
        harness.store.update(state => ({
            ...state,
            search: {
                ...state.search,
                matches: [
                    {
                        entryId: 'request-1',
                        fields: [SEARCH_FIELDS.Query],
                        count: 1,
                    },
                ],
            },
        }));

        // Act
        const panel = new InspectorPanel(harness.context);
        await nextRenderAsync();

        // Assert
        const matchedTabs = [...panel.root.querySelectorAll('.tab[data-match]')].map(tab => tab.textContent);
        expect(matchedTabs).toEqual(['General']);
    });

    test('render_WhenOnlyCookiesMatch_ShouldMarkTheHeaderTabsThatShowThem', async () => {
        // Arrange
        const harness = aSelectedHarness();
        harness.store.update(state => ({
            ...state,
            search: {
                ...state.search,
                matches: [
                    {
                        entryId: 'request-1',
                        fields: [
                            SEARCH_FIELDS.RequestCookies,
                            SEARCH_FIELDS.ResponseCookies,
                        ],
                        count: 2,
                    },
                ],
            },
        }));

        // Act
        const panel = new InspectorPanel(harness.context);
        await nextRenderAsync();

        // Assert
        expect([...panel.root.querySelectorAll('.tab[data-match]')].map(tab => tab.textContent)).toEqual([
            'Request Headers',
            'Response Headers',
        ]);
    });

    test('contextMenu_WhenACallIsSelected_ShouldOfferOpenInClient', async () => {
        // Arrange
        const harness = aSelectedHarness();
        const panel = new InspectorPanel(harness.context);
        document.body.append(panel.root);
        await nextRenderAsync();

        // Act
        const event = rightClick(panel.root.querySelector('.inspector-body')!);

        // Assert
        expect(event.defaultPrevented).toBe(true);
        expect(document.querySelector('.context-menu-item')?.textContent).toBe('Open in HTTP Client');
    });

    test('contextMenu_WhenNothingIsSelected_ShouldKeepTheBrowserMenu', () => {
        // Arrange
        const harness = aPanelHarness();
        const panel = new InspectorPanel(harness.context);
        document.body.append(panel.root);

        // Act
        const event = rightClick(panel.root);

        // Assert
        expect(event.defaultPrevented).toBe(false);
        expect(document.querySelector('.context-menu')).toBeNull();
    });
});
