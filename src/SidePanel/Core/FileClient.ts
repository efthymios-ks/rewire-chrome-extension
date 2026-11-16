import { Result } from '../../Common/Results/Result';

export interface NamedText {
    name: string;
    text: string;
}

export interface DownloadOptions {
    text: string;
    fileName: string;
    mimeType: string;
}

export interface FileClient {
    download(options: DownloadOptions): void;
    pickTextAsync(accept: string): Promise<Result<string | null>>;
    pickNamedTextAsync(accept: string): Promise<Result<NamedText | null>>;
}
