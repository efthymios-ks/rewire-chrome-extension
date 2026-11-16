import { describe, expect, test, vi } from 'vitest';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import { TrafficSearchBar } from './TrafficSearchBar';
import { aSummary } from '../../../TestData';
import { aPanelHarness, aSearchMatching, click, typeInto } from '../../PanelTestData';

const ENTRIES = [
    aSummary({
        id: 'request-1',
    }),
    aSummary({
        id: 'request-2',
    }),
    aSummary({
        id: 'request-3',
    }),
];

function chipTexts(bar: TrafficSearchBar): string[] {
    return [...bar.root.querySelectorAll('.chip')].map(chip => chip.textContent ?? '');
}

function buttonTexts(bar: TrafficSearchBar): string[] {
    return [...bar.root.querySelectorAll('button')].map(button => button.textContent ?? '');
}

function scopeTexts(bar: TrafficSearchBar): string[] {
    return [...bar.root.querySelectorAll('.pick-item')].map(item => item.textContent ?? '');
}

function checkedScopeTexts(bar: TrafficSearchBar): string[] {
    return [...bar.root.querySelectorAll('.pick-item')]
        .filter(item => item.querySelector('input')?.checked === true)
        .map(item => item.textContent ?? '');
}

function scopeSummary(bar: TrafficSearchBar): string {
    return bar.root.querySelector('.pick-summary')?.textContent ?? '';
}

function toggleScope(bar: TrafficSearchBar, text: string): void {
    const item = [...bar.root.querySelectorAll('.pick-item')]
        .find(candidate => candidate.textContent === text);
    const input = item?.querySelector('input');
    if (input == null) {
        throw new Error(`No search area named ${text}.`);
    }

    input.checked = !input.checked;
    input.dispatchEvent(new Event('change'));
}

function statusText(bar: TrafficSearchBar): string {
    return bar.root.querySelector('.search-status')?.textContent ?? '';
}

function pressEnter(bar: TrafficSearchBar, shiftKey: boolean): void {
    bar.root.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey,
        bubbles: true,
        cancelable: true,
    }));
}

describe('TrafficSearchBar', () => {
    test('constructor_WhenBuilt_ShouldOfferTheRegexChipAndTheEightSearchAreas', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const bar = new TrafficSearchBar(harness.context);

        // Assert
        expect(chipTexts(bar)).toEqual(['.*']);
        expect(scopeTexts(bar)).toEqual([
            'URL',
            'Query',
            'Request Headers',
            'Request Body',
            'Request Cookies',
            'Response Headers',
            'Response Body',
            'Response Cookies',
        ]);
    });

    test('constructor_WhenCallsMatch_ShouldOfferNoStepButtons', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: ENTRIES,
            search: aSearchMatching(['request-1', 'request-3']),
        });

        // Act
        const bar = new TrafficSearchBar(harness.context);

        // Assert
        expect(buttonTexts(bar)).toEqual([
            '×',
            ...chipTexts(bar),
        ]);
    });

    test('clearButton_WhenClicked_ShouldEmptyTheSearchAndKeepTheOtherSettings', () => {
        // Arrange
        const harness = aPanelHarness();
        const bar = new TrafficSearchBar(harness.context);
        typeInto(
            /* input: */ bar.root.querySelector<HTMLInputElement>('.traffic-search input')!,
            /* value: */ 'users',
        );
        click(bar.root.querySelector('.chip'));

        // Act
        click(bar.root.querySelector('.search-clear'));

        // Assert
        expect(harness.store.getState().search.query).toEqual({
            text: '',
            isRegex: true,
            scopes: [SEARCH_SCOPES.Url],
        });
        expect(bar.root.querySelector<HTMLInputElement>('.traffic-search input')?.value).toBe('');
    });

    test('constructor_WhenThePanelOpens_ShouldSearchOnlyTheUrl', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const bar = new TrafficSearchBar(harness.context);

        // Assert
        expect(checkedScopeTexts(bar)).toEqual(['URL']);
        expect(scopeSummary(bar)).toBe('URL');
        expect(harness.store.getState().search.query.scopes).toEqual([SEARCH_SCOPES.Url]);
    });

    test('regexChip_WhenClicked_ShouldTurnRegexSearchOn', () => {
        // Arrange
        const harness = aPanelHarness();
        const bar = new TrafficSearchBar(harness.context);

        // Act
        click(bar.root.querySelector('.chip'));

        // Assert
        expect(harness.store.getState().search.query).toEqual({
            text: '',
            isRegex: true,
            scopes: [SEARCH_SCOPES.Url],
        });
        expect(bar.root.querySelector('.chip')?.getAttribute('aria-pressed')).toBe('true');
    });

    test('scopeDropdown_WhenAnAreaIsChecked_ShouldSearchAgainWithItAdded', () => {
        // Arrange
        const harness = aPanelHarness();
        const bar = new TrafficSearchBar(harness.context);
        const setQuery = vi.spyOn(harness.context.trafficSearch, 'setQuery');

        // Act
        toggleScope(bar, 'Query');

        // Assert
        expect(setQuery).toHaveBeenCalledWith({
            text: '',
            isRegex: false,
            scopes: [
                SEARCH_SCOPES.Url,
                SEARCH_SCOPES.Query,
            ],
        });
        expect(checkedScopeTexts(bar)).toEqual([
            'URL',
            'Query',
        ]);
        expect(scopeSummary(bar)).toBe('URL +1');
    });

    test('scopeDropdown_WhenACheckedAreaIsUncheckedWhileAnotherIsOn_ShouldTurnItOff', () => {
        // Arrange
        const harness = aPanelHarness();
        const bar = new TrafficSearchBar(harness.context);
        toggleScope(bar, 'Response Body');

        // Act
        toggleScope(bar, 'URL');

        // Assert
        expect(harness.store.getState().search.query.scopes).toEqual([SEARCH_SCOPES.ResponseBody]);
        expect(checkedScopeTexts(bar)).toEqual(['Response Body']);
        expect(scopeSummary(bar)).toBe('Response Body');
    });

    test('scopeDropdown_WhenTheLastCheckedAreaIsUnchecked_ShouldDoNothing', () => {
        // Arrange
        const harness = aPanelHarness();
        const bar = new TrafficSearchBar(harness.context);
        const setQuery = vi.spyOn(harness.context.trafficSearch, 'setQuery');
        const before = harness.store.getState();

        // Act
        toggleScope(bar, 'URL');

        // Assert
        expect(setQuery).not.toHaveBeenCalled();
        expect(harness.store.getState()).toBe(before);
        expect(checkedScopeTexts(bar)).toEqual(['URL']);
    });

    test('scopeDropdown_WhenSeveralAreasAreChecked_ShouldKeepTheListOrder', () => {
        // Arrange
        const harness = aPanelHarness();
        const bar = new TrafficSearchBar(harness.context);

        // Act
        toggleScope(bar, 'Response Cookies');
        toggleScope(bar, 'Query');
        toggleScope(bar, 'Request Body');

        // Assert
        expect(harness.store.getState().search.query.scopes).toEqual([
            SEARCH_SCOPES.Url,
            SEARCH_SCOPES.Query,
            SEARCH_SCOPES.RequestBody,
            SEARCH_SCOPES.ResponseCookies,
        ]);
        expect(scopeSummary(bar)).toBe('URL +3');
    });

    test('keydown_WhenEnterOrShiftEnterIsPressed_ShouldLeaveTheSelectionAlone', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: ENTRIES,
            search: aSearchMatching(['request-1', 'request-2', 'request-3']),
            selectedEntryId: 'request-2',
        });
        const bar = new TrafficSearchBar(harness.context);
        const before = harness.store.getState();

        // Act
        pressEnter(bar, false);
        pressEnter(bar, true);

        // Assert
        expect(harness.store.getState()).toBe(before);
    });

    test('status_WhenNoSearchIsActive_ShouldBeEmpty', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: ENTRIES,
        });

        // Act
        const bar = new TrafficSearchBar(harness.context);

        // Assert
        expect(statusText(bar)).toBe('');
    });

    test('status_WhenNothingMatches_ShouldSayNoMatches', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: ENTRIES,
            search: aSearchMatching([]),
        });

        // Act
        const bar = new TrafficSearchBar(harness.context);

        // Assert
        expect(statusText(bar)).toBe('No matches');
    });

    test('status_WhenAMatchingCallIsSelected_ShouldStillCountTheMatches', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: ENTRIES,
            search: aSearchMatching(['request-1', 'request-3']),
        });
        const bar = new TrafficSearchBar(harness.context);

        // Act
        harness.store.update(state => ({
            ...state,
            selectedEntryId: 'request-3',
        }));

        // Assert
        expect(statusText(bar)).toBe('2 matches');
    });

    test('status_WhenTheRegexIsInvalid_ShouldShowTheErrorAsAnError', () => {
        // Arrange
        const harness = aPanelHarness({
            entries: ENTRIES,
            search: aSearchMatching(['request-1'], {
                error: 'Invalid regular expression.',
            }),
        });

        // Act
        const bar = new TrafficSearchBar(harness.context);

        // Assert
        expect(statusText(bar)).toBe('Invalid regular expression.');
        expect(bar.root.querySelector('.search-status')?.hasAttribute('data-error')).toBe(true);
    });
});
