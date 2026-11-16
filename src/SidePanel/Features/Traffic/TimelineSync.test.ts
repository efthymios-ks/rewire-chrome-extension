import { describe, expect, test, vi } from 'vitest';
import { Result } from '../../../Common/Results/Result';
import { INSPECTION_STATE, type InspectionState } from '../../../Contracts/Inspection/InspectionState';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { NO_LIVE_LISTENING } from '../../../Contracts/Live/NoLiveListening';
import { PANEL_COMMAND_TYPE, type PanelCommandType } from '../../../Contracts/Messaging/PanelCommandType';
import type { WorkerEvent } from '../../../Contracts/Messaging/WorkerEvent';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import type { InspectedTab } from '../../Core/InspectedTab';
import { Notifier } from '../../Core/Notifier';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { Store } from '../../Core/Store';
import type { WorkerConnection } from '../../Core/WorkerConnection';
import { TimelineSync } from './TimelineSync';
import { aChannel, aLiveMessage, aPostMessage, aSummary } from '../../../TestData';

const TAB_ID = 7;
const NEW_TAB_URL = 'chrome://newtab/';
const API_URL = 'https://jsonplaceholder.typicode.com/posts';

function aTab(url: string, title: string = ''): InspectedTab {
    return {
        tabId: TAB_ID,
        url,
        title,
    };
}

function storeWith(state: InspectionState): Store<PanelState> {
    return new Store<PanelState>({
        ...PanelStateFactory.initial(),
        inspectedTab: aTab(NEW_TAB_URL),
        inspection: {
            state,
            message: '',
        },
    });
}

function anInspection() {
    return {
        status: {
            state: INSPECTION_STATE.Attached,
            message: '',
        },
        entries: [],
        live: {
            channels: [],
            messages: [],
            postMessages: [],
        },
    };
}

function connectionMock(): { connection: WorkerConnection; send: ReturnType<typeof vi.fn> } {
    const send = vi.fn().mockResolvedValue(Result.ok(anInspection()));

    return {
        connection: {
            sendAsync: send,
            onEvent: vi.fn(),
            onReconnect: vi.fn(),
        } as unknown as WorkerConnection,
        send,
    };
}

function aSync(store: Store<PanelState>, connection: WorkerConnection): TimelineSync {
    return new TimelineSync({
        store,
        connection,
        notifier: new Notifier(store),
    });
}

describe('TimelineSync', () => {
    test('updateTab_WhenAttachingFailedAndTheTabMovesToAnotherAddress_ShouldTryAgain', () => {
        // Arrange
        const { connection, send } = connectionMock();
        const sync = aSync(
            /* store: */ storeWith(INSPECTION_STATE.Failed),
            /* connection: */ connection,
        );

        // Act
        sync.updateTab(aTab(API_URL));

        // Assert
        expect(send).toHaveBeenCalledWith({
            type: PANEL_COMMAND_TYPE.InspectTab,
            tabId: TAB_ID,
        });
    });

    test('updateTab_WhenTheDebuggerIsAttached_ShouldOnlyUpdateTheTab', () => {
        // Arrange
        const { connection, send } = connectionMock();
        const store = storeWith(INSPECTION_STATE.Attached);
        const sync = aSync(store, connection);

        // Act
        sync.updateTab(aTab(API_URL));

        // Assert
        expect(send).not.toHaveBeenCalled();
        expect(store.getState().inspectedTab?.url).toBe(API_URL);
    });

    test('updateTab_WhenOnlyTheTitleChanges_ShouldNotTryAgain', () => {
        // Arrange
        const { connection, send } = connectionMock();
        const sync = aSync(
            /* store: */ storeWith(INSPECTION_STATE.Failed),
            /* connection: */ connection,
        );

        // Act
        sync.updateTab(aTab(NEW_TAB_URL, 'New Tab'));

        // Assert
        expect(send).not.toHaveBeenCalled();
    });

    test('start_WhenLiveEventsArrive_ShouldKeepTheChannelsMessagesAndPostMessages', () => {
        // Arrange
        const { connection } = connectionMock();
        const store = storeWith(INSPECTION_STATE.Attached);
        const sync = aSync(store, connection);
        sync.start();
        const route = vi.mocked(connection.onEvent).mock.calls[0]![0] as (event: WorkerEvent) => void;

        // Act
        route({
            type: WORKER_EVENT_TYPE.ChannelUpserted,
            channel: aChannel({ id: 'ws-1' }),
        });
        route({
            type: WORKER_EVENT_TYPE.LiveMessageAdded,
            tabId: TAB_ID,
            message: aLiveMessage(),
        });
        route({
            type: WORKER_EVENT_TYPE.PostMessageAdded,
            record: aPostMessage(),
        });

        // Assert
        const { live } = store.getState();
        expect(live.channels.map(channel => channel.id)).toEqual(['ws-1']);
        expect(live.messages.map(message => message.id)).toEqual(['live-1']);
        expect(live.postMessages.map(record => record.id)).toEqual(['live-9']);
    });

    test('start_WhenACallTurnsOutToBeAStream_ShouldDropItFromTraffic', () => {
        // Arrange
        const { connection } = connectionMock();
        const store = storeWith(INSPECTION_STATE.Attached);
        store.update(state => ({
            ...state,
            entries: [
                aSummary({
                    id: 'stream',
                }),
                aSummary({
                    id: 'call',
                }),
            ],
        }));
        const sync = aSync(store, connection);
        sync.start();
        const route = vi.mocked(connection.onEvent).mock.calls[0]![0] as (event: WorkerEvent) => void;

        // Act
        route({
            type: WORKER_EVENT_TYPE.EntryRemoved,
            tabId: TAB_ID,
            entryId: 'stream',
        });

        // Assert
        expect(store.getState().entries.map(entry => entry.id)).toEqual(['call']);
    });

    test('inspectAsync_WhenAnotherTabIsPicked_ShouldKeepOnlyMyChannels', async () => {
        // Arrange
        const { connection } = connectionMock();
        const store = storeWith(INSPECTION_STATE.Attached);
        store.update(state => ({
            ...state,
            live: {
                channels: [
                    aChannel({ id: 'page-ws' }),
                    aChannel({
                        id: 'mine-ws-1',
                        kind: LIVE_CHANNEL_KIND.WebSocket,
                        isOpen: true,
                        overrides: {
                            isMine: true,
                        },
                    }),
                ],
                messages: [
                    aLiveMessage({
                        id: 'page-frame',
                        channelId: 'page-ws',
                    }),
                    aLiveMessage({
                        id: 'mine-frame',
                        channelId: 'mine-ws-1',
                    }),
                ],
                postMessages: [aPostMessage()],
            },
        }));
        const sync = aSync(store, connection);

        // Act
        await sync.inspectAsync(aTab(API_URL));

        // Assert
        const { live } = store.getState();
        expect(live.channels.map(channel => channel.id)).toEqual(['mine-ws-1']);
        expect(live.messages.map(message => message.id)).toEqual(['mine-frame']);
        expect(live.postMessages).toEqual([]);
    });

    test('inspectAsync_WhenSomethingIsListenedTo_ShouldTellTheNewTab', async () => {
        // Arrange
        const { connection, send } = connectionMock();
        const store = storeWith(INSPECTION_STATE.Attached);
        store.update(state => ({
            ...state,
            liveListening: {
                ...NO_LIVE_LISTENING,
                webSockets: true,
            },
        }));
        const sync = aSync(store, connection);

        // Act
        await sync.inspectAsync(aTab(API_URL));

        // Assert
        expect(send).toHaveBeenLastCalledWith({
            type: PANEL_COMMAND_TYPE.SetLiveListening,
            tabId: TAB_ID,
            listening: {
                ...NO_LIVE_LISTENING,
                webSockets: true,
            },
        });
    });

    test('inspectAsync_WhenNothingIsListenedTo_ShouldOnlyInspect', async () => {
        // Arrange
        const { connection, send } = connectionMock();
        const sync = aSync(
            /* store: */ storeWith(INSPECTION_STATE.Attached),
            /* connection: */ connection,
        );

        // Act
        await sync.inspectAsync(aTab(API_URL));

        // Assert
        const sentTypes = send.mock.calls.map(call => (call[0] as { type: PanelCommandType }).type);
        expect(sentTypes).toEqual([PANEL_COMMAND_TYPE.InspectTab]);
    });

    test('clearAsync_WhenTheWorkerCannotClear_ShouldSayWhy', async () => {
        // Arrange
        const { connection, send } = connectionMock();
        send.mockResolvedValue(Result.fail('The worker is busy.'));
        const store = storeWith(INSPECTION_STATE.Attached);
        const sync = aSync(store, connection);

        // Act
        await sync.clearAsync();

        // Assert
        expect(send).toHaveBeenCalledWith({
            type: PANEL_COMMAND_TYPE.ClearTimeline,
            tabId: TAB_ID,
        });
        expect(store.getState().notice?.message).toBe('The worker is busy.');
    });

    test('clearAsync_WhenTheWorkerClears_ShouldStayQuiet', async () => {
        // Arrange
        const { connection, send } = connectionMock();
        send.mockResolvedValue(Result.done());
        const store = storeWith(INSPECTION_STATE.Attached);
        const sync = aSync(store, connection);

        // Act
        await sync.clearAsync();

        // Assert
        expect(store.getState().notice).toBeNull();
    });

    test('inspectAsync_WhenTheNewTabCannotListen_ShouldSayWhy', async () => {
        // Arrange
        const { connection, send } = connectionMock();
        send
            .mockResolvedValueOnce(Result.ok(anInspection()))
            .mockResolvedValueOnce(Result.fail('The tab closed.'));
        const store = storeWith(INSPECTION_STATE.Attached);
        store.update(state => ({
            ...state,
            liveListening: {
                ...NO_LIVE_LISTENING,
                postMessages: true,
            },
        }));
        const sync = aSync(store, connection);

        // Act
        await sync.inspectAsync(aTab(API_URL));

        // Assert
        expect(store.getState().notice?.message).toBe('The tab closed.');
    });
});
