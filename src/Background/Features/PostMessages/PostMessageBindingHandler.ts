import type { Protocol } from 'devtools-protocol';
import { ByteSize } from '../../../Common/Encoding/ByteSize';
import { FrameLabel } from '../../../Common/Urls/FrameLabel';
import { FRAME_LABELS } from '../../../Contracts/Live/FrameLabels';
import type { CdpEventHandler } from '../Debugging/CdpEventHandler';
import type { LiveStore } from '../Live/LiveStore';
import { POST_MESSAGE_BINDING_NAME } from './PostMessageBindingName';
import { PostMessageProbe, type PostMessageReport } from './PostMessageProbe';
import type { PostMessageSender } from './PostMessageSender';

function senderOf(report: PostMessageReport, receiver: string): string {
    if (report.isFromTop) {
        return FRAME_LABELS.Top;
    }

    return report.isFromSelf ? receiver : FrameLabel.ofUrl(report.origin);
}

export interface PostMessageBindingHandlerDependencies {
    liveStore: LiveStore;
    sender: PostMessageSender;
    now: () => Date;
}

export class PostMessageBindingHandler implements CdpEventHandler<'Runtime.bindingCalled'> {
    readonly event = 'Runtime.bindingCalled';

    private readonly _liveStore: LiveStore;
    private readonly _sender: PostMessageSender;
    private readonly _now: () => Date;

    constructor({ liveStore, sender, now }: PostMessageBindingHandlerDependencies) {
        this._liveStore = liveStore;
        this._sender = sender;
        this._now = now;
    }

    async handleAsync(tabId: number, params: Protocol.Runtime.BindingCalledEvent): Promise<void> {
        if (params.name !== POST_MESSAGE_BINDING_NAME) {
            return;
        }

        const report = PostMessageProbe.parse(params.payload);
        if (report == null) {
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
            isMine: this._sender.claim({ tabId, to, data: report.data }),
        });
    }
}
