import type { LiveMessage } from '../../../Contracts/Live/LiveMessage';
import { LIVE_MESSAGE_DIRECTION, type LiveMessageDirection } from '../../../Contracts/Live/LiveMessageDirection';
import { ClockText } from '../../Core/Formatting/ClockText';
import { SizeText } from '../../Core/Formatting/SizeText';

const FIRST_CONTROL_OPCODE = 8;
const DEFAULT_EVENT_NAME = 'message';

const OPCODE_NAMES: Record<number, string> = Object.freeze({
    0: 'continuation',
    1: 'text',
    2: 'binary',
    8: 'close',
    9: 'ping',
    10: 'pong',
});

const DIRECTION_ARROWS: Record<LiveMessageDirection, string> = Object.freeze({
    [LIVE_MESSAGE_DIRECTION.Sent]: '↑',
    [LIVE_MESSAGE_DIRECTION.Received]: '↓',
});

const DIRECTION_NAMES: Record<LiveMessageDirection, string> = Object.freeze({
    [LIVE_MESSAGE_DIRECTION.Sent]: 'Sent',
    [LIVE_MESSAGE_DIRECTION.Received]: 'Received',
});

export const LiveMessageFacts = {
    arrowOf(message: LiveMessage): string {
        return DIRECTION_ARROWS[message.direction];
    },

    isControl(message: LiveMessage): boolean {
        return message.opcode != null && message.opcode >= FIRST_CONTROL_OPCODE;
    },

    opcodeName(opcode: number): string {
        return OPCODE_NAMES[opcode] ?? `opcode ${opcode}`;
    },

    eventNameOf(message: LiveMessage): string {
        return message.eventName ?? DEFAULT_EVENT_NAME;
    },

    ofFrame(message: LiveMessage): string[] {
        return [
            DIRECTION_NAMES[message.direction],
            `opcode ${message.opcode ?? 0} (${LiveMessageFacts.opcodeName(message.opcode ?? 0)})`,
            SizeText.of(message.size),
            ClockText.precise(message.at),
        ];
    },

    ofEvent(message: LiveMessage): string[] {
        return [
            `event ${LiveMessageFacts.eventNameOf(message)}`,
            `id ${message.eventId ?? 'none'}`,
            `retry ${message.retry == null ? 'none' : `${message.retry} ms`}`,
            SizeText.of(message.size),
            ClockText.precise(message.at),
        ];
    },
};
