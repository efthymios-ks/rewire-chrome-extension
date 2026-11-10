import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";

export enum ClientBodyType {
    None = 1,
    Text = 2,
    Json = 3,
    Xml = 4,
    FormUrlEncoded = 5,
    Multipart = 6,
    Binary = 7,
    GraphQl = 8,
}

export interface KeyValueRow {
    name: string;
    value: string;
}

export interface MultipartRow {
    name: string;
    value: string;
    isFile: boolean;
    file: File | null;
    fileName: string;
}

export interface ClientBody {
    type: ClientBodyType;
    text: string;
    formRows: KeyValueRow[];
    multipartRows: MultipartRow[];
    file: File | null;
    fileName: string;
    graphQlQuery: string;
}

export interface ClientRequest {
    method: string;
    url: string;
    headers: HeaderEntry[];
    body: ClientBody;
}
