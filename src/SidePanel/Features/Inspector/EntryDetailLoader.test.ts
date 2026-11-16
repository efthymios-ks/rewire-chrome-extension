import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { PANEL_LIMITS } from '../../Core/PanelLimits';
import { EntryDetailLoader } from './EntryDetailLoader';
import { aDetail, aSummary } from '../../../TestData';
import { aPanelHarness, sentOf, type PanelHarness } from '../../PanelTestData';

const FIRST = aSummary({
    id: 'request-1',
});

const SECOND = aSummary({
    id: 'request-2',
});

function setUp(selectedEntryId: string | null = null): PanelHarness {
    const harness = aPanelHarness(
        /* state: */ {
            entries: [
                FIRST,
                SECOND,
            ],
            selectedEntryId,
        },
        /* detail: */ aDetail(),
    );
    new EntryDetailLoader(harness.store, harness.context.connection).start();

    return harness;
}

function select(harness: PanelHarness, selectedEntryId: string | null): void {
    harness.store.update(state => ({
        ...state,
        selectedEntryId,
    }));
}

async function waitForTheLoadAsync(): Promise<void> {
    await vi.advanceTimersByTimeAsync(PANEL_LIMITS.DetailLoadDelayInMilliseconds);
}

describe('EntryDetailLoader', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('start_WhenAnEntryIsSelected_ShouldLoadItsDetailAfterTheDelay', async () => {
        // Arrange
        const harness = setUp('request-1');

        // Act
        await waitForTheLoadAsync();

        // Assert
        expect(sentOf(harness, PANEL_COMMAND_TYPE.GetEntryDetail)).toEqual([
            {
                type: PANEL_COMMAND_TYPE.GetEntryDetail,
                tabId: FIRST.tabId,
                entryId: 'request-1',
            },
        ]);
        expect(harness.store.getState().selectedEntryDetail).toEqual(aDetail());
        expect(harness.store.getState().detailVersion).toBe(1);
        expect(harness.store.getState().detailError).toBeNull();
    });

    test('start_WhenNothingIsSelected_ShouldNotLoad', async () => {
        // Arrange
        const harness = setUp();

        // Act
        await waitForTheLoadAsync();

        // Assert
        expect(harness.sent).toEqual([]);
    });

    test('start_WhenTheSelectionChangesQuickly_ShouldLoadOnlyTheLastOne', async () => {
        // Arrange
        const harness = setUp('request-1');

        // Act
        select(harness, 'request-2');
        await waitForTheLoadAsync();

        // Assert
        const requestedEntryIds = sentOf(harness, PANEL_COMMAND_TYPE.GetEntryDetail)
            .map(command => 'entryId' in command ? command.entryId : null);
        expect(requestedEntryIds).toEqual(['request-2']);
    });

    test('start_WhenTheSelectionIsClearedBeforeTheDelay_ShouldCancelTheLoad', async () => {
        // Arrange
        const harness = setUp('request-1');

        // Act
        select(harness, null);
        await waitForTheLoadAsync();

        // Assert
        expect(harness.sent).toEqual([]);
    });

    test('start_WhenTheSelectionMovesWhileLoading_ShouldDropTheStaleDetail', async () => {
        // Arrange
        const harness = setUp('request-1');
        vi.mocked(harness.context.connection.sendAsync).mockImplementationOnce(async () => {
            select(harness, 'request-2');

            return Result.ok(aDetail());
        });

        // Act
        await waitForTheLoadAsync();

        // Assert
        expect(harness.store.getState().selectedEntryDetail).toBeNull();
        expect(harness.store.getState().detailVersion).toBe(0);
    });

    test('start_WhenLoadingFails_ShouldShowTheError', async () => {
        // Arrange
        const harness = setUp('request-1');
        vi.mocked(harness.context.connection.sendAsync)
            .mockResolvedValueOnce(Result.fail('The entry is gone.'));

        // Act
        await waitForTheLoadAsync();

        // Assert
        expect(harness.store.getState().detailError).toBe('The entry is gone.');
        expect(harness.store.getState().selectedEntryDetail).toBeNull();
    });
});
