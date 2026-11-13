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
import type { PanelContext } from "../Shell/PanelContext";
import { OwnStreams } from "./OwnStreams";

function eventItemOf(message: LiveMessage): LiveListItem {
    return {
        id: message.id,
        title: [
            buildElement("span", {
                className: "live-event-name",
                text: LiveMessageFacts.eventNameOf(message),
            }),
        ],
        at: message.at,
        data: message.data,
        hasDataLine: true,
        isMuted: message.data === null,
        facts: LiveMessageFacts.ofEvent(message),
        actions: [],
    };
}

function matches(message: LiveMessage, filter: string): boolean {
    const text = `${LiveMessageFacts.eventNameOf(message)} ${message.data ?? ""}`.toLowerCase();

    return filter === "" || text.includes(filter);
}

export class SseClientView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _streams: OwnStreams;
    private readonly _urlInput: HTMLInputElement;
    private readonly _headers = new HeaderRowsEditor();
    private readonly _channelList: LiveChannelList;
    private readonly _events: LiveList;
    private readonly _filter: HTMLInputElement;
    private readonly _remover: LiveChannelRemover;
    private readonly _clearClosed: HTMLButtonElement;
    private _selectedId: string | null = null;

    constructor(context: PanelContext, streams?: OwnStreams) {
        this._context = context;
        this._streams = streams ?? new OwnStreams({
            store: context.store,
            fetch: (input, init) => fetch(input, init),
            onError: message => context.notifier.show(message),
            now: () => new Date(),
        });
        this._urlInput = FormControls.textInput({
            value: "",
            placeholder: "https://sse.tools.typinks.com/api/story",
            className: "input live-url",
        });
        this._channelList = new LiveChannelList({
            emptyText: "No streams yet. Subscribe to one, or listen to page streams.",
            closeTitle: "Stop this stream",
            removeTitle: "Remove this stream",
            onSelect: channelId => this.select(channelId),
            onClose: channelId => this._streams.stop(channelId),
            onRemove: channelId => void this._remover.remove([channelId]),
        });
        this._remover = new LiveChannelRemover(context);
        this._clearClosed = FormControls.button({
            text: "Clear closed",
            variant: ButtonVariants.Ghost,
            title: "Remove every closed stream and its events",
            onClick: () => void this._remover.remove(this.closedIds()),
        });
        this._events = new LiveList(context, "No events.");
        this._filter = FormControls.textInput({
            value: "",
            placeholder: "Filter",
            className: "input live-filter",
            onInput: () => this.render(),
        });

        this.root = buildElement("section", {
            className: "live-view sse-view",
            children: [
                buildElement("div", {
                    className: "view-header",
                    children: [
                        buildElement("h2", {
                            text: "SSE Client",
                        }),
                        ListeningToggle.build(context, "eventStreams"),
                    ],
                }),
                buildElement("div", {
                    className: "live-connect",
                    children: [
                        this._urlInput,
                        FormControls.button({
                            text: "Subscribe",
                            variant: ButtonVariants.Primary,
                            onClick: () => this.subscribe(),
                        }),
                    ],
                }),
                this._headers.root,
                buildElement("div", {
                    className: "live-section-row",
                    children: [
                        buildElement("h3", {
                            className: "live-section-title",
                            text: "Streams",
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
                            text: "Events",
                        }),
                        this._filter,
                    ],
                }),
                this._events.root,
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

    private subscribe(): void {
        const state = this._context.store.getState();
        const url = PanelVariables.render(state, this._urlInput.value.trim());
        if (url === "") {
            this._context.notifier.show("Enter a stream URL first.");

            return;
        }

        const headers = this._headers
            .values()
            .map(header => ({
                name: header.name,
                value: PanelVariables.render(state, header.value),
            }));
        this.select(this._streams.subscribe(url, headers));
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
        this._events.update(selected === undefined
            ? []
            : LiveEntries
                .messagesOf(live, selected.id)
                .filter(message => matches(message, filter))
                .map(eventItemOf));
    }

    private channels(): LiveChannel[] {
        return this._context.store
            .getState()
            .live.channels
            .filter(channel => channel.kind === LiveChannelKind.EventStream);
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
