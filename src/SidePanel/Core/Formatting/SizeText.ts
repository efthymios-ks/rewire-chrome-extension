const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;
const ONE_DECIMAL = 1;

export const SizeText = {
    of(bytes: number): string {
        if (bytes < BYTES_PER_KILOBYTE) {
            return `${bytes} B`;
        }

        if (bytes < BYTES_PER_MEGABYTE) {
            return `${(bytes / BYTES_PER_KILOBYTE).toFixed(ONE_DECIMAL)} KB`;
        }

        return `${(bytes / BYTES_PER_MEGABYTE).toFixed(ONE_DECIMAL)} MB`;
    },
};
