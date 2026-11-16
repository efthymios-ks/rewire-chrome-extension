import { Result } from '../../../Common/Results/Result';
import type { ClientExchangeResponse } from '../../../Contracts/Messaging/Commands/ClientExchangeResponse';
import type { ClientRequest } from './ClientRequest';

export interface HttpClient {
    sendAsync(request: ClientRequest): Promise<Result<ClientExchangeResponse>>;
}
