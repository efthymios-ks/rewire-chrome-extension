export interface PostMessageRecord {
    id: string;
    tabId: number;
    at: string;
    from: string;
    to: string;
    origin: string;
    data: string;
    size: number;
    isMine: boolean;
}
