import type { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping';
import type { CdpCommandName } from './CdpCommandName';

export type CdpCommandReturn<TCommandName extends CdpCommandName> =
    ProtocolMapping.Commands[TCommandName]['returnType'];
