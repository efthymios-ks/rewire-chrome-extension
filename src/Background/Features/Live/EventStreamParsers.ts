import type { EventStreamEvent } from '../../../Common/EventStream/EventStreamEvent';

export interface FeedOptions {
    tabId: number;
    requestId: string;
    base64: string;
}

export interface EventStreamParsers {
    start(tabId: number, requestId: string): void;
    feed(options: FeedOptions): EventStreamEvent[] | null;
    stop(tabId: number, requestId: string): void;
}
