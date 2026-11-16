import { afterEach, describe, expect, test, vi } from 'vitest';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import { EntrySelection } from './EntrySelection';
import { TimelineList } from './TimelineList';
import { aSummary } from '../../../TestData';
import { aPanelHarness, aSearchMatching, nextRenderAsync } from '../../PanelTestData';

const SEARCHED_ENTRIES = [
    aSummary({
        id: 'request-1',
        path: '/api/users',
    }),
    aSummary({
        id: 'request-2',
        path: '/api/orders',
    }),
    aSummary({
        id: 'request-3',
        path: '/api/users/42',
    }),
];

function listedPaths(list: TimelineList): string[] {
    return [...list.root.querySelectorAll('.timeline-row .path')].map(path => path.textContent ?? '');
}

function shownEmptyStates(list: TimelineList): string[] {
    return [...list.root.querySelectorAll<HTMLElement>('.empty-state')]
        .filter(state => !state.hidden)
        .map(state => state.textContent ?? '');
}

describe('TimelineList', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.replaceChildren();
    });

    test('render_WhenTrafficArrivesAfterASelection_ShouldLeaveTheScrollAlone', async () => {
        // Arrange
        const selected = aSummary({
            id: 'request-1',
        });
        const harness = aPanelHarness({
            entries: [selected],
        });
        const list = new TimelineList(harness.context);
        document.body.append(list.root);
        EntrySelection.select(harness.store, 'request-1');
        await nextRenderAsync();
        const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

        // Act
        harness.store.update(state => ({
            ...state,
            entries: [
                ...state.entries,
                aSummary({
                    id: 'request-2',
                }),
            ],
        }));
        await nextRenderAsync();

        // Assert
        expect(scrollIntoView).not.toHaveBeenCalled();
    });

    test('render_WhenARowIsSelected_ShouldScrollItIntoView', async () => {
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
        });
        const list = new TimelineList(harness.context);
        document.body.append(list.root);
        await nextRenderAsync();
        const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

        // Act
        EntrySelection.select(harness.store, 'request-2');
        await nextRenderAsync();

        // Assert
        expect(scrollIntoView).toHaveBeenCalledOnce();
        expect((scrollIntoView.mock.contexts[0] as HTMLElement).getAttribute('aria-selected')).toBe('true');
    });

    test('render_WhenTheSameRowIsPickedAgain_ShouldScrollItIntoViewAgain', async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [
                aSummary({
                    id: 'request-1',
                }),
            ],
        });
        const list = new TimelineList(harness.context);
        document.body.append(list.root);
        EntrySelection.select(harness.store, 'request-1');
        await nextRenderAsync();
        const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

        // Act
        EntrySelection.select(harness.store, 'request-1');
        await nextRenderAsync();

        // Assert
        expect(scrollIntoView).toHaveBeenCalledOnce();
    });

    test('contextMenu_WhenARowIsRightClicked_ShouldOfferOpenInClientFirst', async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: [aSummary()],
        });
        const list = new TimelineList(harness.context);
        document.body.append(list.root);
        await nextRenderAsync();

        // Act
        list.root.querySelector('.timeline-row')!.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
        }));

        // Assert
        const items = [...document.querySelectorAll('.context-menu-item')].map(item => item.textContent);
        expect(items[0]).toBe('Open in HTTP Client');
        expect(items.slice(1)).toEqual([
            'Copy as cURL (bash)',
            'Copy as cURL (cmd)',
            'Copy as Wget',
            'Copy as Fetch (browser)',
            'Copy as Fetch (Node.js)',
            'Copy as PowerShell',
        ]);
    });

    test('render_WhenASearchHasAnswered_ShouldListOnlyTheMatchingCalls', async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: SEARCHED_ENTRIES,
            search: aSearchMatching(['request-1', 'request-3']),
        });

        // Act
        const list = new TimelineList(harness.context);
        await nextRenderAsync();

        // Assert
        expect(listedPaths(list)).toEqual([
            '/api/users/42',
            '/api/users',
        ]);
        expect(shownEmptyStates(list)).toEqual([]);
    });

    test('render_WhenTheSearchIsCleared_ShouldListEveryCallAgain', async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: SEARCHED_ENTRIES,
            search: aSearchMatching(['request-1']),
        });
        const list = new TimelineList(harness.context);
        await nextRenderAsync();

        // Act
        harness.store.update(state => ({
            ...state,
            search: {
                ...state.search,
                query: {
                    text: '',
                    isRegex: false,
                    scopes: [SEARCH_SCOPES.Url],
                },
            },
        }));
        await nextRenderAsync();

        // Assert
        expect(listedPaths(list)).toHaveLength(SEARCHED_ENTRIES.length);
    });

    test('render_WhenTheSearchMatchesNothing_ShouldSayNoCallsMatch', async () => {
        // Arrange
        const harness = aPanelHarness({
            entries: SEARCHED_ENTRIES,
            search: aSearchMatching([]),
        });

        // Act
        const list = new TimelineList(harness.context);
        await nextRenderAsync();

        // Assert
        expect(listedPaths(list)).toEqual([]);
        expect(shownEmptyStates(list)).toEqual(['No calls match the filters and the search.']);
    });

    test('render_WhenNoCallIsCaptured_ShouldSayNoCallsYet', async () => {
        // Arrange
        const harness = aPanelHarness({
            search: aSearchMatching([]),
        });

        // Act
        const list = new TimelineList(harness.context);
        await nextRenderAsync();

        // Assert
        expect(shownEmptyStates(list)).toEqual([
            'No API calls yet. Fetch and XHR requests of this tab show up here.',
        ]);
    });
});
