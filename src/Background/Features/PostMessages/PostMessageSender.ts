import { Result } from '../../../Common/Results/Result';

export interface SendAsyncOptions {
    tabId: number;
    target: string;
    data: string;
}

export interface ClaimOptions {
    tabId: number;
    to: string;
    data: string;
}

export interface PostMessageSender {
    sendAsync(options: SendAsyncOptions): Promise<Result<void>>;
    claim(options: ClaimOptions): boolean;
}
