export interface MultipartRow {
    name: string;
    value: string;
    isFile: boolean;
    file: File | null;
    fileName: string;
}
