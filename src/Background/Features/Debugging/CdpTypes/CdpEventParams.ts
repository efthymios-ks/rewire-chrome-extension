import type { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping';
import type { CdpEventName } from './CdpEventName';

export type CdpEventParams<TEventName extends CdpEventName> = ProtocolMapping.Events[TEventName][0];
