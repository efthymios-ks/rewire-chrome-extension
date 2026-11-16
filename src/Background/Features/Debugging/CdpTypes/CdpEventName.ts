import type { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping';

export type CdpEventName = keyof ProtocolMapping.Events;
