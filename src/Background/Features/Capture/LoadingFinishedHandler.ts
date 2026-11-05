import type { Protocol } from "devtools-protocol";
import { TimelineEntryState } from "../../../Contracts/Timeline/TimelineEntryState";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import { Durations } from "./Durations";
import type { ITimelineStore } from "./ITimelineStore";
import type { IResponseBodyReader } from "./ResponseBodyReader";

export class LoadingFinishedHandler implements ICdpEventHandler<"Network.loadingFinished"> {
    readonly event = "Network.loadingFinished";

    private readonly _timelineStore: ITimelineStore;
    private readonly _bodyReader: IResponseBodyReader;

    constructor(timelineStore: ITimelineStore, bodyReader: IResponseBodyReader) {
        this._timelineStore = timelineStore;
        this._bodyReader = bodyReader;
    }

    async handle(tabId: number, event: Protocol.Network.LoadingFinishedEvent): Promise<void> {
        const record = this._timelineStore.get(tabId, event.requestId);
        if (record === undefined) {
            return;
        }

        const captured = await this._bodyReader.read(
            tabId,
            event.requestId,
            record.summary.mimeType
        );

        this._timelineStore.update(
            tabId,
            event.requestId,
            current => ({
                ...current,
                responseBody: captured.body,
                responseBodyNote: captured.note,
                summary: {
                    ...current.summary,
                    state: TimelineEntryState.Completed,
                    durationInMilliseconds: Durations.betweenTimestamps(current.startedTimestamp, event.timestamp),
                },
            })
        );
    }
}
