import type { LiveChannel } from '../../../Contracts/Live/LiveChannel';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import type { LiveMessage } from '../../../Contracts/Live/LiveMessage';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { buildElement } from '../../Core/Dom/buildElement';
import { PanelVariables } from '../../Core/PanelVariables';
import { LiveClientPane } from '../Live/LiveClientPane';
import type { LiveListItem } from '../Live/LiveList';
import { LiveMessageFacts } from '../Live/LiveMessageFacts';
import { LiveSendBar } from '../Live/LiveSendBar';
import type { PanelContext } from '../Shell/PanelContext';
import { ChromeHandshakeHeaderRules } from './ChromeHandshakeHeaderRules';
import { OwnSockets } from './OwnSockets';

function frameItemOf(message: LiveMessage): LiveListItem {
    const isControl = LiveMessageFacts.isControl(message);
    const label = isControl ? LiveMessageFacts.opcodeName(message.opcode ?? 0) : message.data ?? '';

    return {
        id: message.id,
        title: [
            buildElement('span', {
                className: 'live-arrow',
                text: LiveMessageFacts.arrowOf(message),
            }),
            buildElement('span', {
                className: 'live-inline-preview',
                text: label,
            }),
        ],
        at: message.at,
        data: message.data,
        hasDataLine: false,
        isMuted: isControl,
        facts: LiveMessageFacts.ofFrame(message),
        actions: [],
    };
}

function matches(message: LiveMessage, filter: string): boolean {
    return filter === '' || (message.data ?? '').toLowerCase().includes(filter);
}

export class WsClientView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _sockets: OwnSockets;
    private readonly _sendBar: LiveSendBar;
    private readonly _pane: LiveClientPane;

    constructor(context: PanelContext, sockets?: OwnSockets) {
        this._context = context;
        this._sockets = sockets ?? new OwnSockets({
            store: context.store,
            headerRules: new ChromeHandshakeHeaderRules(),
            createSocket: url => new WebSocket(url),
            now: () => new Date(),
        });
        this._sendBar = new LiveSendBar({
            className: 'ws-send',
            placeholder: 'Message',
            leading: null,
            onSend: text => this.send(text),
        });
        this._pane = new LiveClientPane({
            context,
            kind: LIVE_CHANNEL_KIND.WebSocket,
            className: 'ws-view',
            title: 'WS Client',
            listeningKind: 'webSockets',
            connect: {
                placeholder: 'wss://ws.postman-echo.com/raw',
                buttonText: 'Connect',
                missingUrlText: 'Enter a WebSocket URL first.',
                onConnect: (url, headers) => void this.connectAsync(url, headers),
            },
            channels: {
                title: 'Sockets',
                emptyText: 'No sockets yet. Connect one, or listen to page sockets.',
                closeTitle: 'Close this socket',
                removeTitle: 'Remove this socket',
                clearClosedTitle: 'Remove every closed socket and its frames',
                onClose: channelId => this._sockets.close(channelId),
            },
            messages: {
                title: 'Frames',
                emptyText: 'No frames.',
                itemOf: frameItemOf,
                matches,
            },
            footer: this._sendBar.root,
            onRender: selected => this.renderSendBar(selected),
        });
        this.root = this._pane.root;
        void this._sockets.startAsync();
    }

    private async connectAsync(url: string, headers: HeaderEntry[]): Promise<void> {
        const connected = await this._sockets.connectAsync(url, headers);
        if (connected.hasErrors) {
            this._context.notifier.show(connected.error);

            return;
        }

        this._pane.select(connected.value);
    }

    private send(text: string): void {
        const selected = this._pane.selected();
        if (selected == null) {
            return;
        }

        const sent = this._sockets.send(
            /* channelId: */ selected.id,
            /* text: */ PanelVariables.render(
                /* state: */ this._context.store.getState(),
                /* text: */ text,
            ),
        );
        if (sent.hasErrors) {
            this._context.notifier.show(sent.error);
        }
    }

    private renderSendBar(selected: LiveChannel | undefined): void {
        this._sendBar.root.hidden = selected == null
            || !selected.isMine
            || !selected.isOpen;
    }
}
