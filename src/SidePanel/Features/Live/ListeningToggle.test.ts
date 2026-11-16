import { describe, expect, test } from 'vitest';
import { NO_LIVE_LISTENING } from '../../../Contracts/Live/NoLiveListening';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { ListeningToggle } from './ListeningToggle';
import { aPanelHarness, nextRenderAsync, sentOf } from '../../PanelTestData';

const INSPECTED_TAB = {
    tabId: 7,
    url: 'https://app.example.com/',
    title: 'App',
};

describe('ListeningToggle', () => {
    test('build_WhenThePanelOpens_ShouldBeOffAndNameWhatItCaptures', () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const toggle = ListeningToggle.build(harness.context, 'webSockets');

        // Assert
        expect(toggle.querySelector<HTMLInputElement>('input')?.checked).toBe(false);
        expect(toggle.textContent).toBe('Listen to page sockets');
        expect(toggle.title).toContain('WebSockets of the inspected tab');
    });

    test('change_WhenTurnedOn_ShouldListenAndTellTheWorker', async () => {
        // Arrange
        const harness = aPanelHarness({
            inspectedTab: INSPECTED_TAB,
        });
        const toggle = ListeningToggle.build(harness.context, 'eventStreams');
        const input = toggle.querySelector<HTMLInputElement>('input')!;

        // Act
        input.checked = true;
        input.dispatchEvent(new Event('change'));
        await nextRenderAsync();

        // Assert
        expect(input.checked).toBe(true);
        expect(sentOf(harness, PANEL_COMMAND_TYPE.SetLiveListening)).toEqual([
            {
                type: PANEL_COMMAND_TYPE.SetLiveListening,
                tabId: 7,
                listening: {
                    ...NO_LIVE_LISTENING,
                    eventStreams: true,
                },
            },
        ]);
    });

    test('sendAsync_WhenNoTabIsInspected_ShouldSendNothing', async () => {
        // Arrange
        const harness = aPanelHarness();

        // Act
        const result = await ListeningToggle.sendAsync(harness.store, harness.context.connection);

        // Assert
        expect(result.hasErrors).toBe(false);
        expect(harness.sent).toEqual([]);
    });
});
