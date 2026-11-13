import { ByteSize } from "../../../Common/Encoding/ByteSize";
import type { EventStreamEvent } from "../../../Common/EventStream/EventStreamEvent";
import { EventStreamParser } from "../../../Common/EventStream/EventStreamParser";
import { ErrorText } from "../../../Common/Errors/ErrorText";
import type { LiveChannel } from "../../../Contracts/Live/LiveChannel";
import { LiveChannelKind } from "../../../Contracts/Live/LiveChannelKind";
import { LiveMessageDirection } from "../../../Contracts/Live/LiveMessageDirection";
import { OwnChannels } from "../../../Contracts/Live/OwnChannels";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { LiveState } from "../../Core/LiveState";
import type { PanelState } from "../../Core/PanelState";
import type { Store } from "../../Core/Store";
import { LiveEntries } from "../Live/LiveEntries";

const ChannelPrefix = "mine-sse-";
const AcceptHeader = "Accept";
const EventStreamMime = "text/event-stream";

export type FetchFunction = (input: string, init: RequestInit) => Promise<Response>;

export interface OwnStreamsDependencies {
    store: Store<PanelState>;
    fetch: FetchFunction;
    onError: (message: string) => void;
    now: () => Date;
}

function requestHeadersOf(headers: HeaderEntry[]): Headers {
    const requestHeaders = new Headers();
    requestHeaders.set(AcceptHeader, EventStreamMime);
    headers.forEach(header => requestHeaders.set(header.name, header.value));

    return requestHeaders;
}

export class OwnStreams {
    private readonly _dependencies: OwnStreamsDependencies;
    private readonly _controllers = new Map<string, AbortController>();
    private _sequence = 0;

    constructor(dependencies: OwnStreamsDependencies) {
        this._dependencies = dependencies;
    }

    subscribe(url: string, headers: HeaderEntry[]): string {
        this._sequence += 1;
        const channel: LiveChannel = {
            id: `${ChannelPrefix}${this._sequence}`,
            tabId: OwnChannels.TabId,
            kind: LiveChannelKind.EventStream,
            url,
            isOpen: true,
            isMine: true,
            openedAt: this._dependencies.now().toISOString(),
        };
        const controller = new AbortController();
        this._controllers.set(channel.id, controller);
        this.update(live => LiveEntries.upsertChannel(live, channel));
        void this.read(
            channel,
            headers,
            controller.signal
        );

        return channel.id;
    }

    stop(channelId: string): void {
        this._controllers.get(channelId)?.abort();
    }

    private async read(
        channel: LiveChannel,
        headers: HeaderEntry[],
        signal: AbortSignal
    ): Promise<void> {
        try {
            const response = await this._dependencies.fetch(
                channel.url,
                {
                    headers: requestHeadersOf(headers),
                    credentials: "include",
                    cache: "no-store",
                    signal,
                }
            );
            if (!response.ok || response.body === null) {
                const status = response.statusText === "" ? String(response.status) : `${response.status} ${response.statusText}`;
                this._dependencies.onError(`${channel.url} answered ${status}.`);

                return;
            }

            await this.readBody(channel.id, response.body);
        } catch (error) {
            if (!signal.aborted) {
                this._dependencies.onError(`Can't subscribe to ${channel.url}: ${ErrorText.of(error)}`);
            }
        } finally {
            this._controllers.delete(channel.id);
            this.update(live => LiveEntries.upsertChannel(
                live,
                {
                    ...channel,
                    isOpen: false,
                }
            ));
        }
    }

    private async readBody(channelId: string, body: ReadableStream<Uint8Array>): Promise<void> {
        const parser = new EventStreamParser();
        const decoder = new TextDecoder();
        const reader = body.getReader();
        for (;;) {
            const chunk = await reader.read();
            if (chunk.done) {
                return;
            }

            parser
                .push(decoder.decode(
                    chunk.value,
                    {
                        stream: true,
                    }
                ))
                .forEach(event => this.addEvent(channelId, event));
        }
    }

    private addEvent(channelId: string, event: EventStreamEvent): void {
        this._sequence += 1;
        this.update(live => LiveEntries.addMessage(
            live,
            {
                id: `${channelId}-${this._sequence}`,
                channelId,
                direction: LiveMessageDirection.Received,
                at: this._dependencies.now().toISOString(),
                data: event.data,
                size: event.data === null ? 0 : ByteSize.ofText(event.data),
                opcode: null,
                eventName: event.event,
                eventId: event.id,
                retry: event.retry,
            }
        ));
    }

    private update(change: (live: LiveState) => LiveState): void {
        this._dependencies.store.update(state => ({
            ...state,
            live: change(state.live),
        }));
    }
}
