import type { Result } from '../../../Common/Results/Result';
import type { ClientExchangeResponse } from '../../../Contracts/Messaging/Commands/ClientExchangeResponse';
import type { ClientRequest } from './ClientRequest';
import { ClientRoutes } from './ClientRoutes';
import type { HttpClient } from './HttpClient';

export class RoutedHttpClient implements HttpClient {
    private readonly _browser: HttpClient;
    private readonly _debugger: HttpClient;

    constructor(browser: HttpClient, viaDebugger: HttpClient) {
        this._browser = browser;
        this._debugger = viaDebugger;
    }

    sendAsync(request: ClientRequest): Promise<Result<ClientExchangeResponse>> {
        return ClientRoutes.needsDebugger(request)
            ? this._debugger.sendAsync(request)
            : this._browser.sendAsync(request);
    }
}
