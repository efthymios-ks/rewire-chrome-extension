import type { LiveChannel } from "../../../Contracts/Live/LiveChannel";
import { LiveChannelKind } from "../../../Contracts/Live/LiveChannelKind";
import type { LiveMessage } from "../../../Contracts/Live/LiveMessage";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { Equalities } from "../../Core/Equalities";
import { PanelVariables } from "../../Core/PanelVariables";
import { HeaderRowsEditor } from "../Live/HeaderRowsEditor";
import { LiveChannelList } from "../Live/LiveChannelList";
import { LiveChannelRemover } from "../Live/LiveChannelRemover";
import { LiveEntries } from "../Live/LiveEntries";
import { LiveList, type LiveListItem } from "../Live/LiveList";
import { ListeningToggle } from "../Live/ListeningToggle";
import { LiveMessageFacts } from "../Live/LiveMessageFacts";
import { LiveSendBar } from "../Live/LiveSendBar";
import type { PanelContext } from "../Shell/PanelContext";
import { HandshakeHeaderRules } from "./HandshakeHeaderRules";
import { OwnSockets } from "./OwnSockets";

function frameItemOf(message: LiveMessage): LiveListItem {
    const isControl = LiveMessageFacts.isControl(message);
    const label = isControl ? LiveMessageFacts.opcodeName(message.opcode ?? 0) : message.data ?? "";

    return {
        id: message.id,
        title: [
            buildElement("span", {
                className: "live-arrow",
                text: LiveMessageFacts.arrowOf(message),
            }),
            buildElement("span", {
                className: "live-inline-preview",
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
    return filter === "" || (message.data ?? "").toLowerCase().includes(filter);
}

export class WsClientView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _sockets: OwnSockets;
    private readonly _urlInput: HTMLInputElement;
    private readonly _headers = new HeaderRowsEditor();
    private readonly _channelList: LiveChannelList;
    private readonly _frames: LiveList;
    private readonly _filter: HTMLInputElement;
    private readonly _sendBar: LiveSendBar;
    private readonly _remover: LiveChannelRemover;
    private readonly _clearClosed: HTMLButtonElement;
    private _selectedId: string | null = null;

    constructor(context: PanelContext, sockets?: OwnSockets) {
        this._context = context;
        this._sockets = sockets ?? new OwnSockets({
            store: context.store,
            headerRules: new HandshakeHeaderRules(),
            createSocket: url => new WebSocket(url),
            now: () => new Date(),
        });
        this._urlInput = FormControls.textInput({
            value: "",
            placeholder: "wss://ws.postman-echo.com/raw",
            className: "input live-url",
        });
        this._channelList = new LiveChannelList({
            emptyText: "No sockets yet. Connect one, or listen to page sockets.",
            closeTitle: "Close this socket",
            removeTitle: "Remove this socket",
            onSelect: channelId => this.select(channelId),
            onClose: channelId => this._sockets.close(channelId),
            onRemove: channelId => void this._remover.remove([channelId]),
        });
        this._remover = new LiveChannelRemover(context);
        this._clearClosed = FormControls.button({
            text: "Clear closed",
            variant: ButtonVariants.Ghost,
            title: "Remove every closed socket and its frames",
            onClick: () => void this._remover.remove(this.closedIds()),
        });
        this._frames = new LiveList(context, "No frames.");
        this._filter = FormControls.textInput({
            value: "",
            placeholder: "Filter",
            className: "input live-filter",
            onInput: () => this.render(),
        });
        this._sendBar = new LiveSendBar({
            className: "ws-send",
            placeholder: "Message",
            leading: null,
            onSend: text => this.send(text),
        });

        this.root = buildElement("section", {
            className: "live-view ws-view",
            children: [
                buildElement("div", {
                    className: "view-header",
                    children: [
                        buildElement("h2", {
                            text: "WS Client",
                        }),
                        ListeningToggle.build(context, "webSockets"),
                    ],
                }),
                buildElement("div", {
                    className: "live-connect",
                    children: [
                        this._urlInput,
                        FormControls.button({
                            text: "Connect",
                            variant: ButtonVariants.Primary,
                            onClick: () => void this.connect(),
                        }),
                    ],
                }),
                this._headers.root,
                buildElement("div", {
                    className: "live-section-row",
                    children: [
                        buildElement("h3", {
                            className: "live-section-title",
                            text: "Sockets",
                        }),
                        this._clearClosed,
                    ],
                }),
                this._channelList.root,
                buildElement("div", {
                    className: "live-section-row",
                    children: [
                        buildElement("h3", {
                            className: "live-section-title",
                            text: "Frames",
                        }),
                        this._filter,
                    ],
                }),
                this._frames.root,
                this._sendBar.root,
            ],
        });

        context.store.select(
            state => [
                state.live.channels,
                state.live.messages,
            ],
            () => this.render(),
            Equalities.shallowArray
        );
    }

    private async connect(): Promise<void> {
        const state = this._context.store.getState();
        const url = PanelVariables.render(state, this._urlInput.value.trim());
        if (url === "") {
            this._context.notifier.show("Enter a WebSocket URL first.");

            return;
        }

        const headers = this._headers
            .values()
            .map(header => ({
                name: header.name,
                value: PanelVariables.render(state, header.value),
            }));
        const connected = await this._sockets.connect(url, headers);
        if (connected.hasErrors) {
            this._context.notifier.show(connected.error);

            return;
        }

        this.select(connected.value);
    }

    private send(text: string): void {
        if (this._selectedId === null) {
            return;
        }

        const sent = this._sockets.send(this._selectedId, PanelVariables.render(this._context.store.getState(), text));
        if (sent.hasErrors) {
            this._context.notifier.show(sent.error);
        }
    }

    private select(channelId: string): void {
        this._selectedId = channelId;
        this.render();
    }

    private render(): void {
        const { live } = this._context.store.getState();
        const channels = this.channels();
        this._clearClosed.hidden = !channels.some(channel => !channel.isOpen);
        const selected = this.selectedOf(channels);
        this._channelList.update(
            channels.map(channel => ({
                channel,
                count: LiveEntries.messagesOf(live, channel.id).length,
            })),
            selected?.id ?? null
        );

        const filter = this._filter.value.trim().toLowerCase();
        this._frames.update(selected === undefined
            ? []
            : LiveEntries
                .messagesOf(live, selected.id)
                .filter(message => matches(message, filter))
                .map(frameItemOf));
        this._sendBar.root.hidden = selected === undefined || !selected.isMine || !selected.isOpen;
    }

    private channels(): LiveChannel[] {
        return this._context.store
            .getState()
            .live.channels
            .filter(channel => channel.kind === LiveChannelKind.WebSocket);
    }

    private closedIds(): string[] {
        return this.channels()
            .filter(channel => !channel.isOpen)
            .map(channel => channel.id);
    }

    private selectedOf(channels: LiveChannel[]): LiveChannel | undefined {
        return channels.find(channel => channel.id === this._selectedId) ?? channels.at(-1);
    }
}
