import type { Protocol } from 'devtools-protocol';
import type { TimelineRecord } from './TimelineRecord';

export interface ToCompletedLegOptions {
    base: TimelineRecord;
    legId: string;
    response: Protocol.Network.Response;
    endedTimestamp: number;
}

export interface TimelineRecordFactory {
    create(tabId: number, event: Protocol.Network.RequestWillBeSentEvent): TimelineRecord;
    redirect(record: TimelineRecord, event: Protocol.Network.RequestWillBeSentEvent): TimelineRecord;
    toCompletedLeg(options: ToCompletedLegOptions): TimelineRecord;
}
