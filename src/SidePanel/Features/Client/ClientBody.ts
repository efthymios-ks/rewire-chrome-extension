import type { ClientBodyType } from './ClientBodyType';
import type { KeyValueRow } from './KeyValueRow';
import type { MultipartRow } from './MultipartRow';

export interface ClientBody {
    type: ClientBodyType;
    text: string;
    formRows: KeyValueRow[];
    multipartRows: MultipartRow[];
    file: File | null;
    fileName: string;
    graphQlQuery: string;
}
