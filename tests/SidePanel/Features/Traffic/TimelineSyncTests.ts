import { describe, expect, test, vi } from "vitest";
import { Result } from "../../../../src/Common/Results/Result";
import { InspectionState } from "../../../../src/Contracts/Inspection/InspectionState";
import { LiveChannelKind } from "../../../../src/Contracts/Live/LiveChannelKind";
import { NoLiveListening } from "../../../../src/Contracts/Live/LiveListening";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import type { WorkerEvent } from "../../../../src/Contracts/Messaging/WorkerEvent";
import { WorkerEventType } from "../../../../src/Contracts/Messaging/WorkerEventType";
import type { InspectedTab } from "../../../../src/SidePanel/Core/InspectedTab";
import type { PanelState } from "../../../../src/SidePanel/Core/PanelState";
import { PanelStateFactory } from "../../../../src/SidePanel/Core/PanelStateFactory";
import { Store } from "../../../../src/SidePanel/Core/Store";
import type { IWorkerConnection } from "../../../../src/SidePanel/Core/WorkerConnection";
import { TimelineSync } from "../../../../src/SidePanel/Features/Traffic/TimelineSync";
import { aChannel, aLiveMessage, aPostMessage, aSummary } from "../../../TestData";

const TabId = 7;
const NewTabUrl = "chrome://newtab/";
const ApiUrl = "https://jsonplaceholder.typicode.com/posts";

function aTab(url: string, title: string = ""): InspectedTab {
    return {
        tabId: TabId,
        url,
        title,
    };
}

function storeWith(state: InspectionState): Store<PanelState> {
    return new Store<PanelState>({
        ...PanelStateFactory.initial(),
        inspectedTab: aTab(NewTabUrl),
        inspection: {
            state,
            message: "",
        },
    });
}

function connectionMock(): { connection: IWorkerConnection; send: ReturnType<typeof vi.fn> } {
    const send = vi.fn().mockResolvedValue(Result.ok({
        status: {
            state: InspectionState.Attached,
            message: "",
        },
        entries: [],
        live: {
            channels: [],
            messages: [],
            postMessages: [],
        },
    }));

    return {
        connection: {
            send,
            onEvent: vi.fn(),
            onReconnect: vi.fn(),
        } as unknown as IWorkerConnection,
        send,
    };
}

describe("TimelineSync", () => {
    test("updateTab_WhenAttachingFailedAndTheTabMovesToAnotherAddress_ShouldTryAgain", () => {
        // Arrange
        const { connection, send } = connectionMock();
        const sync = new TimelineSync(storeWith(InspectionState.Failed), connection);

        // Act
        sync.updateTab(aTab(ApiUrl));

        // Assert
        expect(send).toHaveBeenCalledWith({
            type: PanelCommandType.InspectTab,
            tabId: TabId,
        });
    });

    test("updateTab_WhenTheDebuggerIsAttached_ShouldOnlyUpdateTheTab", () => {
        // Arrange
        const { connection, send } = connectionMock();
        const store = storeWith(InspectionState.Attached);
        const sync = new TimelineSync(store, connection);

        // Act
        sync.updateTab(aTab(ApiUrl));

        // Assert
        expect(send).not.toHaveBeenCalled();
        expect(store.getState().inspectedTab?.url).toBe(ApiUrl);
    });

    test("updateTab_WhenOnlyTheTitleChanges_ShouldNotTryAgain", () => {
        // Arrange
        const { connection, send } = connectionMock();
        const sync = new TimelineSync(storeWith(InspectionState.Failed), connection);

        // Act
        sync.updateTab(aTab(NewTabUrl, "New Tab"));

        // Assert
        expect(send).not.toHaveBeenCalled();
    });

    test("start_WhenLiveEventsArrive_ShouldKeepTheChannelsMessagesAndPostMessages", () => {
        // Arrange
        const { connection } = connectionMock();
        const store = storeWith(InspectionState.Attached);
        const sync = new TimelineSync(store, connection);
        sync.start();
        const route = vi.mocked(connection.onEvent).mock.calls[0]![0] as (event: WorkerEvent) => void;

        // Act
        route({
            type: WorkerEventType.ChannelUpserted,
            channel: aChannel("ws-1"),
        });
        route({
            type: WorkerEventType.LiveMessageAdded,
            tabId: TabId,
            message: aLiveMessage(),
        });
        route({
            type: WorkerEventType.PostMessageAdded,
            record: aPostMessage(),
        });

        // Assert
        const { live } = store.getState();
        expect(live.channels.map(channel => channel.id)).toEqual(["ws-1"]);
        expect(live.messages.map(message => message.id)).toEqual(["live-1"]);
        expect(live.postMessages.map(record => record.id)).toEqual(["live-9"]);
    });

    test("start_WhenACallTurnsOutToBeAStream_ShouldDropItFromTraffic", () => {
        // Arrange
        const { connection } = connectionMock();
        const store = storeWith(InspectionState.Attached);
        store.update(state => ({
            ...state,
            entries: [
                aSummary({
                    id: "stream",
                }),
                aSummary({
                    id: "call",
                }),
            ],
        }));
        const sync = new TimelineSync(store, connection);
        sync.start();
        const route = vi.mocked(connection.onEvent).mock.calls[0]![0] as (event: WorkerEvent) => void;

        // Act
        route({
            type: WorkerEventType.EntryRemoved,
            tabId: TabId,
            entryId: "stream",
        });

        // Assert
        expect(store.getState().entries.map(entry => entry.id)).toEqual(["call"]);
    });

    test("inspect_WhenAnotherTabIsPicked_ShouldKeepOnlyMyChannels", async () => {
        // Arrange
        const { connection } = connectionMock();
        const store = storeWith(InspectionState.Attached);
        store.update(state => ({
            ...state,
            live: {
                channels: [
                    aChannel("page-ws"),
                    aChannel(
                        "mine-ws-1",
                        LiveChannelKind.WebSocket,
                        true,
                        {
                            isMine: true,
                        }
                    ),
                ],
                messages: [
                    aLiveMessage({
                        id: "page-frame",
                        channelId: "page-ws",
                    }),
                    aLiveMessage({
                        id: "mine-frame",
                        channelId: "mine-ws-1",
                    }),
                ],
                postMessages: [aPostMessage()],
            },
        }));
        const sync = new TimelineSync(store, connection);

        // Act
        await sync.inspect(aTab(ApiUrl));

        // Assert
        const { live } = store.getState();
        expect(live.channels.map(channel => channel.id)).toEqual(["mine-ws-1"]);
        expect(live.messages.map(message => message.id)).toEqual(["mine-frame"]);
        expect(live.postMessages).toEqual([]);
    });

    test("inspect_WhenSomethingIsListenedTo_ShouldTellTheNewTab", async () => {
        // Arrange
        const { connection, send } = connectionMock();
        const store = storeWith(InspectionState.Attached);
        store.update(state => ({
            ...state,
            liveListening: {
                ...NoLiveListening,
                webSockets: true,
            },
        }));
        const sync = new TimelineSync(store, connection);

        // Act
        await sync.inspect(aTab(ApiUrl));

        // Assert
        expect(send).toHaveBeenLastCalledWith({
            type: PanelCommandType.SetLiveListening,
            tabId: TabId,
            listening: {
                ...NoLiveListening,
                webSockets: true,
            },
        });
    });

    test("inspect_WhenNothingIsListenedTo_ShouldOnlyInspect", async () => {
        // Arrange
        const { connection, send } = connectionMock();
        const sync = new TimelineSync(storeWith(InspectionState.Attached), connection);

        // Act
        await sync.inspect(aTab(ApiUrl));

        // Assert
        expect(send.mock.calls.map(call => (call[0] as { type: PanelCommandType }).type)).toEqual([PanelCommandType.InspectTab]);
    });
});
