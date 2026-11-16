export interface MultipartPart {
    name: string;
    value: string;
    fileName: string | null;
    contentType: string;
}
