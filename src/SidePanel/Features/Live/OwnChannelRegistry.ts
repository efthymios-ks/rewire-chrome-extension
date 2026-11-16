import type { LiveChannel } from '../../../Contracts/Live/LiveChannel';
import type { LiveChannelKind } from '../../../Contracts/Live/LiveChannelKind';
import type { LiveMessage } from '../../../Contracts/Live/LiveMessage';
import { OWN_CHANNELS } from '../../../Contracts/Live/OwnChannels';
import type { LiveState } from '../../Core/LiveState';
import type { PanelState } from '../../Core/PanelState';
import type { Store } from '../../Core/Store';
import { LiveEntries } from './LiveEntries';

export interface OwnChannelRegistryOptions {
    store: Store<PanelState>;
    kind: LiveChannelKind;
    idPrefix: string;
    now: () => Date;
}

export class OwnChannelRegistry<THandle> {
    private readonly _options: OwnChannelRegistryOptions;
    private readonly _handles = new Map<string, THandle>();
    private _sequence = 0;

    constructor(options: OwnChannelRegistryOptions) {
        this._options = options;
    }

    open(url: string, handle: THandle): LiveChannel {
        this._sequence += 1;
        const channel: LiveChannel = {
            id: `${this._options.idPrefix}${this._sequence}`,
            tabId: OWN_CHANNELS.TabId,
            kind: this._options.kind,
            url,
            isOpen: true,
            isMine: true,
            openedAt: this._options.now().toISOString(),
        };
        this._handles.set(channel.id, handle);
        this.update(live => LiveEntries.upsertChannel(live, channel));

        return channel;
    }

    handleOf(channelId: string): THandle | undefined {
        return this._handles.get(channelId);
    }

    close(channel: LiveChannel): THandle | undefined {
        const handle = this._handles.get(channel.id);
        this._handles.delete(channel.id);
        this.update(live => LiveEntries.upsertChannel(
            /* live: */ live,
            /* channel: */ {
                ...channel,
                isOpen: false,
            },
        ));

        return handle;
    }

    addMessage(message: Omit<LiveMessage, 'id' | 'at'>): void {
        this._sequence += 1;
        const id = `${message.channelId}-${this._sequence}`;
        const at = this._options.now().toISOString();
        this.update(live => LiveEntries.addMessage(
            /* live: */ live,
            /* message: */ {
                ...message,
                id,
                at,
            },
        ));
    }

    private update(change: (live: LiveState) => LiveState): void {
        this._options.store.update(state => ({
            ...state,
            live: change(state.live),
        }));
    }
}
