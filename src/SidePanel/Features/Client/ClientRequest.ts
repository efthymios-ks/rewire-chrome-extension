import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { ClientBody } from './ClientBody';

export interface ClientRequest {
    method: string;
    url: string;
    headers: HeaderEntry[];
    body: ClientBody;
}
