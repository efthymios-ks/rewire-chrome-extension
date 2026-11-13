const BytesPerKilobyte = 1024;
const BytesPerMegabyte = BytesPerKilobyte * BytesPerKilobyte;
const OneDecimal = 1;

export const SizeText = {
    of(bytes: number): string {
        if (bytes < BytesPerKilobyte) {
            return `${bytes} B`;
        }

        if (bytes < BytesPerMegabyte) {
            return `${(bytes / BytesPerKilobyte).toFixed(OneDecimal)} KB`;
        }

        return `${(bytes / BytesPerMegabyte).toFixed(OneDecimal)} MB`;
    },
};
