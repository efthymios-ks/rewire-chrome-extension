import type { Protocol } from "devtools-protocol";
import { ByteSize } from "../../../Common/Encoding/ByteSize";
import type { LiveMessageDirection } from "../../../Contracts/Live/LiveMessageDirection";
import type { LiveMessageDraft } from "./LiveStore";

const BinaryOpcode = 2;

export const WebSocketFrames = {
    toDraft(
        requestId: string,
        direction: LiveMessageDirection,
        frame: Protocol.Network.WebSocketFrame,
        at: Date
    ): LiveMessageDraft {
        const isBinary = frame.opcode === BinaryOpcode;

        return {
            channelId: requestId,
            direction,
            at: at.toISOString(),
            data: frame.payloadData,
            size: isBinary ? ByteSize.ofBase64(frame.payloadData) : ByteSize.ofText(frame.payloadData),
            opcode: frame.opcode,
            eventName: null,
            eventId: null,
            retry: null,
        };
    },
};
