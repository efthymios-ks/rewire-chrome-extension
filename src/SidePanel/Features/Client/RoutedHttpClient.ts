import type { Result } from "../../../Common/Results/Result";
import type { ClientExchangeResponse } from "../../../Contracts/Messaging/Commands/LogClientExchangeCommand";
import type { ClientRequest } from "./ClientRequest";
import { ClientRoutes } from "./ClientRoutes";
import type { IHttpClient } from "./HttpClient";

export class RoutedHttpClient implements IHttpClient {
    private readonly _browser: IHttpClient;
    private readonly _debugger: IHttpClient;

    constructor(browser: IHttpClient, viaDebugger: IHttpClient) {
        this._browser = browser;
        this._debugger = viaDebugger;
    }

    send(request: ClientRequest): Promise<Result<ClientExchangeResponse>> {
        return ClientRoutes.needsDebugger(request) ? this._debugger.send(request) : this._browser.send(request);
    }
}
