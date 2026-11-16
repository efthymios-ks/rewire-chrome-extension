import { Base64Text } from '../../../Common/Encoding/Base64Text';
import type { EventStreamEvent } from '../../../Common/EventStream/EventStreamEvent';
import { EventStreamParser } from '../../../Common/EventStream/EventStreamParser';
import { TabScopedKey } from '../../Core/TabScopedKey';
import type { EventStreamParsers, FeedOptions } from './EventStreamParsers';

interface StreamReader {
    parser: EventStreamParser;
    decoder: TextDecoder;
}

export class DefaultEventStreamParsers implements EventStreamParsers {
    private readonly _readers = new Map<string, StreamReader>();

    start(tabId: number, requestId: string): void {
        this._readers.set(
            /* key: */ TabScopedKey.of(tabId, requestId),
            /* value: */ {
                parser: new EventStreamParser(),
                decoder: new TextDecoder(),
            },
        );
    }

    feed({ tabId, requestId, base64 }: FeedOptions): EventStreamEvent[] | null {
        const reader = this._readers.get(TabScopedKey.of(tabId, requestId));
        if (reader == null) {
            return null;
        }

        const text = reader.decoder.decode(
            /* input: */ Base64Text.toBytes(base64),
            /* options: */ {
                stream: true,
            },
        );

        return reader.parser.push(text);
    }

    stop(tabId: number, requestId: string): void {
        this._readers.delete(TabScopedKey.of(tabId, requestId));
    }
}
