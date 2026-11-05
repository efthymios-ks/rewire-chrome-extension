import type { ProtocolMapping } from "devtools-protocol/types/protocol-mapping";

export type CdpCommandName = keyof ProtocolMapping.Commands;

export type CdpCommandParams<TCommandName extends CdpCommandName> = ProtocolMapping.Commands[TCommandName]["paramsType"];

export type CdpCommandReturn<TCommandName extends CdpCommandName> = ProtocolMapping.Commands[TCommandName]["returnType"];

export type CdpEventName = keyof ProtocolMapping.Events;

export type CdpEventParams<TEventName extends CdpEventName> = ProtocolMapping.Events[TEventName][0];
