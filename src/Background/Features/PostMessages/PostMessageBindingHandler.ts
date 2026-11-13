import type { Protocol } from "devtools-protocol";
import { ByteSize } from "../../../Common/Encoding/ByteSize";
import { FrameLabel } from "../../../Common/Urls/FrameLabel";
import { FrameLabels } from "../../../Contracts/Live/FrameLabels";
import type { ICdpEventHandler } from "../Debugging/ICdpEventHandler";
import type { ILiveStore } from "../Live/LiveStore";
import { PostMessageBindingName, PostMessageProbe, type PostMessageReport } from "./PostMessageProbe";
import type { IPostMessageSender } from "./PostMessageSender";

function senderOf(report: PostMessageReport, receiver: string): string {
    if (report.isFromTop) {
        return FrameLabels.Top;
    }

    return report.isFromSelf ? receiver : FrameLabel.ofUrl(report.origin);
}

export class PostMessageBindingHandler implements ICdpEventHandler<"Runtime.bindingCalled"> {
    readonly event = "Runtime.bindingCalled";

    private readonly _liveStore: ILiveStore;
    private readonly _sender: IPostMessageSender;
    private readonly _now: () => Date;

    constructor(
        liveStore: ILiveStore,
        sender: IPostMessageSender,
        now: () => Date
    ) {
        this._liveStore = liveStore;
        this._sender = sender;
        this._now = now;
    }

    async handle(tabId: number, params: Protocol.Runtime.BindingCalledEvent): Promise<void> {
        if (params.name !== PostMessageBindingName) {
            return;
        }

        const report = PostMessageProbe.parse(params.payload);
        if (report === null) {
            return;
        }

        const to = FrameLabel.of(report.href, report.isTop);
        this._liveStore.addPostMessage({
            tabId,
            at: this._now().toISOString(),
            from: senderOf(report, to),
            to,
            origin: report.origin,
            data: report.data,
            size: ByteSize.ofText(report.data),
            isMine: this._sender.claim(
                tabId,
                to,
                report.data
            ),
        });
    }
}
