export interface CapturedBody {
    body: string | null;
    note: string | null;
}

export interface ReadAsyncOptions {
    tabId: number;
    requestId: string;
    mimeType: string;
}

export interface ResponseBodyReader {
    readAsync(options: ReadAsyncOptions): Promise<CapturedBody>;
}
