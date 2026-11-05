import type { Protocol } from "devtools-protocol";
import { HeaderLookup } from "../../../Common/Http/HeaderLookup";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { ITimelineStore } from "./ITimelineStore";

export class RequestExtraInfoHandler implements ICdpEventHandler<"Network.requestWillBeSentExtraInfo"> {
    readonly event = "Network.requestWillBeSentExtraInfo";

    private readonly _timelineStore: ITimelineStore;

    constructor(timelineStore: ITimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handle(tabId: number, event: Protocol.Network.RequestWillBeSentExtraInfoEvent): Promise<void> {
        const rawRequestHeaders = HeaderLookup.fromRawRecord(event.headers);

        this._timelineStore.updateOrDefer(
            tabId,
            event.requestId,
            record => ({
                ...record,
                rawRequestHeaders,
            })
        );
    }
}
