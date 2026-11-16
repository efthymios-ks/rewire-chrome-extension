import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { SyntheticResponse } from './SyntheticResponse';

export interface RequestDraft {
    url: string;
    method: string;
    headers: HeaderEntry[];
    body: string | null;
    resourceType: string;
    response: SyntheticResponse | null;
}
