import type { Protocol } from 'devtools-protocol';
import { ByteSize } from '../../../Common/Encoding/ByteSize';
import type { LiveMessageDirection } from '../../../Contracts/Live/LiveMessageDirection';
import type { LiveMessageDraft } from './LiveMessageDraft';

const BINARY_OPCODE = 2;

export interface ToDraftOptions {
    requestId: string;
    direction: LiveMessageDirection;
    frame: Protocol.Network.WebSocketFrame;
    at: Date;
}

export const WebSocketFrames = {
    toDraft({ requestId, direction, frame, at }: ToDraftOptions): LiveMessageDraft {
        const isBinary = frame.opcode === BINARY_OPCODE;

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
