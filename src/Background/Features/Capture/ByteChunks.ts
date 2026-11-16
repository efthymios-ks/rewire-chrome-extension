export const ByteChunks = {
    join(chunks: Uint8Array[]): Uint8Array {
        const joined = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
            joined.set(chunk, offset);
            offset += chunk.length;
        }

        return joined;
    },
};
