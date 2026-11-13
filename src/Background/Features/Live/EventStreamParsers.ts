import { Base64Text } from "../../../Common/Encoding/Base64Text";
import type { EventStreamEvent } from "../../../Common/EventStream/EventStreamEvent";
import { EventStreamParser } from "../../../Common/EventStream/EventStreamParser";

interface StreamReader {
    parser: EventStreamParser;
    decoder: TextDecoder;
}

function keyOf(tabId: number, requestId: string): string {
    return `${tabId}:${requestId}`;
}

export interface IEventStreamParsers {
    start(tabId: number, requestId: string): void;
    feed(
        tabId: number,
        requestId: string,
        base64: string
    ): EventStreamEvent[] | null;
    stop(tabId: number, requestId: string): void;
}

export class EventStreamParsers implements IEventStreamParsers {
    private readonly _readers = new Map<string, StreamReader>();

    start(tabId: number, requestId: string): void {
        this._readers.set(
            keyOf(tabId, requestId),
            {
                parser: new EventStreamParser(),
                decoder: new TextDecoder(),
            }
        );
    }

    feed(
        tabId: number,
        requestId: string,
        base64: string
    ): EventStreamEvent[] | null {
        const reader = this._readers.get(keyOf(tabId, requestId));
        if (reader === undefined) {
            return null;
        }

        const text = reader.decoder.decode(
            Base64Text.toBytes(base64),
            {
                stream: true,
            }
        );

        return reader.parser.push(text);
    }

    stop(tabId: number, requestId: string): void {
        this._readers.delete(keyOf(tabId, requestId));
    }
}
