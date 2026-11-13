import type { LiveMessage } from "../../../Contracts/Live/LiveMessage";
import { LiveMessageDirection } from "../../../Contracts/Live/LiveMessageDirection";
import { ClockText } from "../../Core/Formatting/ClockText";
import { SizeText } from "../../Core/Formatting/SizeText";

const FirstControlOpcode = 8;
const DefaultEventName = "message";

const OpcodeNames: Record<number, string> = {
    0: "continuation",
    1: "text",
    2: "binary",
    8: "close",
    9: "ping",
    10: "pong",
};

const DirectionArrows: Record<LiveMessageDirection, string> = {
    [LiveMessageDirection.Sent]: "↑",
    [LiveMessageDirection.Received]: "↓",
};

const DirectionNames: Record<LiveMessageDirection, string> = {
    [LiveMessageDirection.Sent]: "Sent",
    [LiveMessageDirection.Received]: "Received",
};

export const LiveMessageFacts = {
    arrowOf(message: LiveMessage): string {
        return DirectionArrows[message.direction];
    },

    isControl(message: LiveMessage): boolean {
        return message.opcode !== null && message.opcode >= FirstControlOpcode;
    },

    opcodeName(opcode: number): string {
        return OpcodeNames[opcode] ?? `opcode ${opcode}`;
    },

    eventNameOf(message: LiveMessage): string {
        return message.eventName ?? DefaultEventName;
    },

    ofFrame(message: LiveMessage): string[] {
        return [
            DirectionNames[message.direction],
            `opcode ${message.opcode ?? 0} (${LiveMessageFacts.opcodeName(message.opcode ?? 0)})`,
            SizeText.of(message.size),
            ClockText.precise(message.at),
        ];
    },

    ofEvent(message: LiveMessage): string[] {
        return [
            `event ${LiveMessageFacts.eventNameOf(message)}`,
            `id ${message.eventId ?? "none"}`,
            `retry ${message.retry === null ? "none" : `${message.retry} ms`}`,
            SizeText.of(message.size),
            ClockText.precise(message.at),
        ];
    },
};
