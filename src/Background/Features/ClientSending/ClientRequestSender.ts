import { Result } from '../../../Common/Results/Result';
import type { ClientExchangeResponse } from '../../../Contracts/Messaging/Commands/ClientExchangeResponse';
import type { SentClientRequest } from '../../../Contracts/Messaging/Commands/SentClientRequest';

export interface ClientRequestSender {
    sendAsync(request: SentClientRequest): Promise<Result<ClientExchangeResponse>>;
}
