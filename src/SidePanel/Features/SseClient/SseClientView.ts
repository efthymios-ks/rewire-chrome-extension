import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import type { LiveMessage } from '../../../Contracts/Live/LiveMessage';
import { buildElement } from '../../Core/Dom/buildElement';
import { LiveClientPane } from '../Live/LiveClientPane';
import type { LiveListItem } from '../Live/LiveList';
import { LiveMessageFacts } from '../Live/LiveMessageFacts';
import type { PanelContext } from '../Shell/PanelContext';
import { OwnStreams } from './OwnStreams';

function eventItemOf(message: LiveMessage): LiveListItem {
    return {
        id: message.id,
        title: [
            buildElement('span', {
                className: 'live-event-name',
                text: LiveMessageFacts.eventNameOf(message),
            }),
        ],
        at: message.at,
        data: message.data,
        hasDataLine: true,
        isMuted: message.data == null,
        facts: LiveMessageFacts.ofEvent(message),
        actions: [],
    };
}

function matches(message: LiveMessage, filter: string): boolean {
    const text = `${LiveMessageFacts.eventNameOf(message)} ${message.data ?? ''}`.toLowerCase();

    return filter === '' || text.includes(filter);
}

export class SseClientView {
    readonly root: HTMLElement;

    private readonly _streams: OwnStreams;
    private readonly _pane: LiveClientPane;

    constructor(context: PanelContext, streams?: OwnStreams) {
        this._streams = streams ?? new OwnStreams({
            store: context.store,
            fetch: (input, init) => fetch(input, init),
            onError: message => context.notifier.show(message),
            now: () => new Date(),
        });
        this._pane = new LiveClientPane({
            context,
            kind: LIVE_CHANNEL_KIND.EventStream,
            className: 'sse-view',
            title: 'SSE Client',
            listeningKind: 'eventStreams',
            connect: {
                placeholder: 'https://sse.tools.typinks.com/api/story',
                buttonText: 'Subscribe',
                missingUrlText: 'Enter a stream URL first.',
                onConnect: (url, headers) => this._pane.select(this._streams.subscribe(url, headers)),
            },
            channels: {
                title: 'Streams',
                emptyText: 'No streams yet. Subscribe to one, or listen to page streams.',
                closeTitle: 'Stop this stream',
                removeTitle: 'Remove this stream',
                clearClosedTitle: 'Remove every closed stream and its events',
                onClose: channelId => this._streams.stop(channelId),
            },
            messages: {
                title: 'Events',
                emptyText: 'No events.',
                itemOf: eventItemOf,
                matches,
            },
        });
        this.root = this._pane.root;
    }
}
