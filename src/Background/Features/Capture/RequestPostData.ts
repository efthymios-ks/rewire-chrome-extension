import type { Protocol } from 'devtools-protocol';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { ByteChunks } from './ByteChunks';

export const RequestPostData = {
    bytesOf(request: Protocol.Network.Request): Uint8Array | null {
        const chunks = (request.postDataEntries ?? [])
            .map(entry => entry.bytes)
            .filter(bytes => bytes != null)
            .map(bytes => Base64Text.toBytes(bytes));

        return chunks.length === 0 ? null : ByteChunks.join(chunks);
    },

    fetchedBytesOf(fetched: Protocol.Network.GetRequestPostDataResponse): Uint8Array {
        return fetched.base64Encoded
            ? Base64Text.toBytes(fetched.postData)
            : new TextEncoder().encode(fetched.postData);
    },
};
