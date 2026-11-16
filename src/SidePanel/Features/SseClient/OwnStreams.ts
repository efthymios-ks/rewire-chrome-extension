import { ByteSize } from '../../../Common/Encoding/ByteSize';
import type { EventStreamEvent } from '../../../Common/EventStream/EventStreamEvent';
import { EventStreamParser } from '../../../Common/EventStream/EventStreamParser';
import { ErrorText } from '../../../Common/Errors/ErrorText';
import { HEADER_NAMES } from '../../../Contracts/Http/HeaderNames';
import type { LiveChannel } from '../../../Contracts/Live/LiveChannel';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { LIVE_MESSAGE_DIRECTION } from '../../../Contracts/Live/LiveMessageDirection';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { PanelState } from '../../Core/PanelState';
import type { Store } from '../../Core/Store';
import { OwnChannelRegistry } from '../Live/OwnChannelRegistry';

const CHANNEL_PREFIX = 'mine-sse-';
const EVENT_STREAM_MIME = 'text/event-stream';

export type FetchFunction = (input: string, init: RequestInit) => Promise<Response>;

export interface OwnStreamsDependencies {
    store: Store<PanelState>;
    fetch: FetchFunction;
    onError: (message: string) => void;
    now: () => Date;
}

function requestHeadersOf(headers: HeaderEntry[]): Headers {
    const requestHeaders = new Headers();
    requestHeaders.set(HEADER_NAMES.Accept, EVENT_STREAM_MIME);
    headers.forEach(header => requestHeaders.set(header.name, header.value));

    return requestHeaders;
}

export interface ReadAsyncOptions {
    channel: LiveChannel;
    headers: HeaderEntry[];
    signal: AbortSignal;
}

export class OwnStreams {
    private readonly _dependencies: OwnStreamsDependencies;
    private readonly _channels: OwnChannelRegistry<AbortController>;

    constructor(dependencies: OwnStreamsDependencies) {
        this._dependencies = dependencies;
        this._channels = new OwnChannelRegistry({
            store: dependencies.store,
            kind: LIVE_CHANNEL_KIND.EventStream,
            idPrefix: CHANNEL_PREFIX,
            now: () => dependencies.now(),
        });
    }

    subscribe(url: string, headers: HeaderEntry[]): string {
        const controller = new AbortController();
        const channel = this._channels.open(url, controller);
        void this.readAsync({ channel, headers, signal: controller.signal });

        return channel.id;
    }

    stop(channelId: string): void {
        this._channels.handleOf(channelId)?.abort();
    }

    private async readAsync({ channel, headers, signal }: ReadAsyncOptions): Promise<void> {
        try {
            const response = await this._dependencies.fetch(
                /* input: */ channel.url,
                /* init: */ {
                    headers: requestHeadersOf(headers),
                    credentials: 'include',
                    cache: 'no-store',
                    signal,
                },
            );
            if (!response.ok || response.body == null) {
                const status = response.statusText === ''
                    ? String(response.status)
                    : `${response.status} ${response.statusText}`;
                this._dependencies.onError(`${channel.url} answered ${status}.`);

                return;
            }

            await this.readBodyAsync(channel.id, response.body);
        } catch (error) {
            if (!signal.aborted) {
                this._dependencies.onError(`Can't subscribe to ${channel.url}: ${ErrorText.of(error)}`);
            }
        } finally {
            this._channels.close(channel);
        }
    }

    private async readBodyAsync(channelId: string, body: ReadableStream<Uint8Array>): Promise<void> {
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
                    /* input: */ chunk.value,
                    /* options: */ {
                        stream: true,
                    },
                ))
                .forEach(event => this.addEvent(channelId, event));
        }
    }

    private addEvent(channelId: string, event: EventStreamEvent): void {
        this._channels.addMessage({
            channelId,
            direction: LIVE_MESSAGE_DIRECTION.Received,
            data: event.data,
            size: event.data == null ? 0 : ByteSize.ofText(event.data),
            opcode: null,
            eventName: event.event,
            eventId: event.id,
            retry: event.retry,
        });
    }
}
