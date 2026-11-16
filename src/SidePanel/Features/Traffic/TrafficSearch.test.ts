import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { SearchMatch } from '../../../Contracts/Search/SearchMatch';
import { SEARCH_FIELDS } from '../../../Contracts/Search/SearchField';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import { PANEL_LIMITS } from '../../Core/PanelLimits';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { Store } from '../../Core/Store';
import type { WorkerConnection } from '../../Core/WorkerConnection';
import { TrafficSearch } from './TrafficSearch';
import { aSummary } from '../../../TestData';
import { aSearchMatching } from '../../PanelTestData';

const QUERY = Object.freeze({
    text: 'users',
    isRegex: false,
    scopes: [SEARCH_SCOPES.Url],
});

const INSPECTED_TAB = Object.freeze({
    tabId: 7,
    url: 'https://shop.example.com',
    title: 'Shop',
});

function aMatch(entryId: string): SearchMatch {
    return {
        entryId,
        fields: [SEARCH_FIELDS.Url],
        count: 1,
    };
}

function setUp(state: Partial<PanelState> = {}, answer: Result<SearchMatch[]> = Result.ok([])) {
    const store = new Store<PanelState>({
        ...PanelStateFactory.initial(),
        inspectedTab: INSPECTED_TAB,
        ...state,
    });
    const sendAsync = vi.fn().mockResolvedValue(answer);
    const connection: WorkerConnection = {
        sendAsync: sendAsync as WorkerConnection['sendAsync'],
        onEvent: vi.fn(),
        onReconnect: vi.fn(),
    };

    return {
        store,
        sendAsync,
        search: new TrafficSearch(store, connection),
    };
}

function withMatches(matches: SearchMatch[]): Partial<PanelState> {
    return {
        search: {
            ...PanelStateFactory.initial().search,
            matches,
        },
    };
}

async function debounceAsync(): Promise<void> {
    await vi.advanceTimersByTimeAsync(PANEL_LIMITS.SearchDebounceInMilliseconds);
}

describe('TrafficSearch', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('setQuery_WhenTyped_ShouldStoreTheQueryAndSearchOnlyAfterTheDebounce', async () => {
        // Arrange
        const { store, sendAsync, search } = setUp();

        // Act
        search.setQuery(QUERY);
        await vi.advanceTimersByTimeAsync(PANEL_LIMITS.SearchDebounceInMilliseconds - 1);
        const callsBefore = sendAsync.mock.calls.length;
        await vi.advanceTimersByTimeAsync(1);

        // Assert
        expect(store.getState().search.query).toEqual(QUERY);
        expect(callsBefore).toBe(0);
        expect(sendAsync).toHaveBeenCalledWith({
            type: PANEL_COMMAND_TYPE.SearchTimeline,
            tabId: 7,
            query: QUERY,
        });
    });

    test('setQuery_WhenTypedRepeatedly_ShouldSearchOnceForTheLastQuery', async () => {
        // Arrange
        const { sendAsync, search } = setUp();

        // Act
        search.setQuery({
            ...QUERY,
            text: 'u',
        });
        search.setQuery(QUERY);
        await debounceAsync();

        // Assert
        expect(sendAsync).toHaveBeenCalledOnce();
        expect(sendAsync.mock.lastCall?.[0].query).toEqual(QUERY);
    });

    test('setQuery_WhenTheScopesChange_ShouldSearchAgainWithThemAfterTheDebounce', async () => {
        // Arrange
        const { sendAsync, search } = setUp();
        search.setQuery(QUERY);
        await debounceAsync();
        sendAsync.mockClear();
        const scoped = {
            ...QUERY,
            scopes: [
                SEARCH_SCOPES.Url,
                SEARCH_SCOPES.Query,
            ],
        };

        // Act
        search.setQuery(scoped);
        await vi.advanceTimersByTimeAsync(PANEL_LIMITS.SearchDebounceInMilliseconds - 1);
        const callsBefore = sendAsync.mock.calls.length;
        await vi.advanceTimersByTimeAsync(1);

        // Assert
        expect(callsBefore).toBe(0);
        expect(sendAsync).toHaveBeenCalledOnce();
        expect(sendAsync.mock.lastCall?.[0].query).toEqual(scoped);
    });

    test('setQuery_WhenACallIsSelected_ShouldLeaveTheSelectionAlone', async () => {
        // Arrange
        const { store, search } = setUp(
            /* state: */ {
                entries: [
                    aSummary({
                        id: 'request-1',
                    }),
                    aSummary({
                        id: 'request-2',
                    }),
                ],
                search: aSearchMatching(['request-1', 'request-2']),
                selectedEntryId: 'request-2',
            },
            /* answer: */ Result.ok([aMatch('request-1')]),
        );

        // Act
        search.setQuery(QUERY);
        await debounceAsync();

        // Assert
        expect(store.getState().selectedEntryId).toBe('request-2');
        expect(store.getState().search.matches).toHaveLength(1);
    });

    test('setQuery_WhenTheAnswerIsOnItsWay_ShouldKeepTheTextOfTheLastAnswer', async () => {
        // Arrange
        const { store, search } = setUp(
            /* state: */ {},
            /* answer: */ Result.ok([aMatch('request-1')]),
        );

        // Act
        search.setQuery(QUERY);
        const searchedTextBefore = store.getState().search.searchedText;
        await debounceAsync();

        // Assert
        expect(searchedTextBefore).toBe('');
        expect(store.getState().search.searchedText).toBe(QUERY.text);
    });

    test('setQuery_WhenTheWorkerFindsMatches_ShouldListThemNewestFirst', async () => {
        // Arrange
        const { store, search } = setUp({}, Result.ok([
            aMatch('request-1'),
            aMatch('request-2'),
        ]));

        // Act
        search.setQuery(QUERY);
        await debounceAsync();

        // Assert
        expect(store.getState().search.matches.map(match => match.entryId)).toEqual([
            'request-2',
            'request-1',
        ]);
        expect(store.getState().search.error).toBeNull();
    });

    test('setQuery_WhenTheSearchFails_ShouldClearTheMatchesAndShowTheError', async () => {
        // Arrange
        const { store, search } = setUp(
            /* state: */ withMatches([aMatch('request-1')]),
            /* answer: */ Result.fail('Invalid regular expression.'),
        );

        // Act
        search.setQuery(QUERY);
        await debounceAsync();

        // Assert
        expect(store.getState().search.matches).toEqual([]);
        expect(store.getState().search.error).toBe('Invalid regular expression.');
        expect(store.getState().search.searchedText).toBe(QUERY.text);
    });

    test('setQuery_WhenTheTextIsEmpty_ShouldClearTheMatchesWithoutAsking', async () => {
        // Arrange
        const { store, sendAsync, search } = setUp({
            search: aSearchMatching(['request-1']),
        });

        // Act
        search.setQuery({
            ...QUERY,
            text: '',
        });
        await debounceAsync();

        // Assert
        expect(sendAsync).not.toHaveBeenCalled();
        expect(store.getState().search.matches).toEqual([]);
        expect(store.getState().search.searchedText).toBe('');
    });

    test('setQuery_WhenNoTabIsInspected_ShouldClearTheMatchesWithoutAsking', async () => {
        // Arrange
        const { store, sendAsync, search } = setUp({
            inspectedTab: null,
        });

        // Act
        search.setQuery(QUERY);
        await debounceAsync();

        // Assert
        expect(sendAsync).not.toHaveBeenCalled();
        expect(store.getState().search.matches).toEqual([]);
    });

    test('setQuery_WhenAnOlderSearchAnswersLast_ShouldKeepTheNewerResult', async () => {
        // Arrange
        const { store, sendAsync, search } = setUp();
        let answerOlder: (result: Result<SearchMatch[]>) => void = () => {};
        sendAsync
            .mockImplementationOnce(() => new Promise(resolve => {
                answerOlder = resolve;
            }))
            .mockResolvedValueOnce(Result.ok([aMatch('request-2')]));
        search.setQuery(QUERY);
        await debounceAsync();
        search.setQuery({
            ...QUERY,
            text: 'orders',
        });
        await debounceAsync();

        // Act
        answerOlder(Result.ok([aMatch('request-1')]));
        await vi.advanceTimersByTimeAsync(0);

        // Assert
        expect(store.getState().search.matches.map(match => match.entryId)).toEqual(['request-2']);
    });

    test('start_WhenEntriesArrive_ShouldSearchAgain', async () => {
        // Arrange
        const { store, sendAsync, search } = setUp({
            search: {
                ...PanelStateFactory.initial().search,
                query: QUERY,
            },
        });
        search.start();
        await debounceAsync();
        sendAsync.mockClear();

        // Act
        store.update(state => ({
            ...state,
            entries: [aSummary()],
        }));
        await debounceAsync();

        // Assert
        expect(sendAsync).toHaveBeenCalledOnce();
    });

    test('start_WhenAnEntryIsUpdatedInPlace_ShouldSearchAgain', async () => {
        // Arrange
        const { store, sendAsync, search } = setUp({
            entries: [aSummary({ durationInMilliseconds: null })],
            search: {
                ...PanelStateFactory.initial().search,
                query: QUERY,
            },
        });
        search.start();
        await debounceAsync();
        sendAsync.mockClear();

        // Act
        store.update(state => ({
            ...state,
            entries: [aSummary({ durationInMilliseconds: 120 })],
        }));
        await debounceAsync();

        // Assert
        expect(sendAsync).toHaveBeenCalledOnce();
    });

    test('start_WhenTrafficKeepsFlowing_ShouldSearchOncePerWaitInsteadOfWaitingForAPause', async () => {
        // Arrange
        const updates = 10;
        const gapInMilliseconds = PANEL_LIMITS.SearchDebounceInMilliseconds / 3;
        const { store, sendAsync, search } = setUp({
            search: {
                ...PanelStateFactory.initial().search,
                query: QUERY,
            },
        });
        search.start();
        await debounceAsync();
        sendAsync.mockClear();

        // Act
        for (let index = 0; index < updates; index++) {
            store.update(state => ({
                ...state,
                entries: [...state.entries, aSummary({ id: `request-${index}` })],
            }));
            await vi.advanceTimersByTimeAsync(gapInMilliseconds);
        }

        // Assert
        expect(sendAsync).toHaveBeenCalledTimes(3);
    });

    test('start_WhenNothingIsSearched_ShouldLeaveTheSearchAloneAsEntriesArrive', async () => {
        // Arrange
        const { store, sendAsync, search } = setUp();
        search.start();
        await debounceAsync();
        const before = store.getState().search;

        // Act
        store.update(state => ({
            ...state,
            entries: [aSummary()],
        }));
        await debounceAsync();

        // Assert
        expect(store.getState().search).toBe(before);
        expect(sendAsync).not.toHaveBeenCalled();
    });
});
