import { Result } from '../../../Common/Results/Result';

export interface PostMessageProbeInstaller {
    installAsync(tabId: number, sessionId: string | null): Promise<Result<void>>;
    uninstallAsync(tabId: number, sessionId: string | null): Promise<void>;
    forget(tabId: number): void;
}
