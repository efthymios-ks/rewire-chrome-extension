import type { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping';

export type CdpCommandName = keyof ProtocolMapping.Commands;
