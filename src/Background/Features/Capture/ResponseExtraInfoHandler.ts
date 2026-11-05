import type { Protocol } from "devtools-protocol";
import { HeaderLookup } from "../../../Common/Http/HeaderLookup";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { ITimelineStore } from "./ITimelineStore";

export class ResponseExtraInfoHandler implements ICdpEventHandler<"Network.responseReceivedExtraInfo"> {
    readonly event = "Network.responseReceivedExtraInfo";

    private readonly _timelineStore: ITimelineStore;

    constructor(timelineStore: ITimelineStore) {
        this._timelineStore = timelineStore;
    }

    async handle(tabId: number, event: Protocol.Network.ResponseReceivedExtraInfoEvent): Promise<void> {
        const rawResponseHeaders = HeaderLookup.fromRawRecord(event.headers);

        this._timelineStore.updateOrDefer(
            tabId,
            event.requestId,
            record => ({
                ...record,
                rawResponseHeaders,
            })
        );
    }
}
