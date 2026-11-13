import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { PanelContext } from "../Shell/PanelContext";
import { LiveEntries } from "./LiveEntries";

export class LiveChannelRemover {
    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    async remove(channelIds: string[]): Promise<void> {
        const { store, connection, notifier } = this._context;
        const { live, inspectedTab } = store.getState();
        const closedIds = live.channels
            .filter(channel => channelIds.includes(channel.id) && !channel.isOpen)
            .map(channel => channel.id);
        const pageIds = live.channels
            .filter(channel => closedIds.includes(channel.id) && !channel.isMine)
            .map(channel => channel.id);
        store.update(state => ({
            ...state,
            live: LiveEntries.withoutChannels(state.live, closedIds),
        }));
        if (pageIds.length === 0 || inspectedTab === null) {
            return;
        }

        const removed = await connection.send<PanelCommandType.RemoveLiveChannels>({
            type: PanelCommandType.RemoveLiveChannels,
            tabId: inspectedTab.tabId,
            channelIds: pageIds,
        });
        if (removed.hasErrors) {
            notifier.show(removed.error);
        }
    }
}
