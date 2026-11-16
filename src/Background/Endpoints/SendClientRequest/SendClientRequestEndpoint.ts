import type { Result } from '../../../Common/Results/Result';
import type { ClientExchangeResponse } from '../../../Contracts/Messaging/Commands/ClientExchangeResponse';
import type { SendClientRequestCommand } from '../../../Contracts/Messaging/Commands/SendClientRequestCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { ClientRequestSender } from '../../Features/ClientSending/ClientRequestSender';
import type { PanelEndpoint } from '../PanelEndpoint';

export class SendClientRequestEndpoint implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.SendClientRequest> {
    readonly commandType = PANEL_COMMAND_TYPE.SendClientRequest;

    private readonly _sender: ClientRequestSender;

    constructor(sender: ClientRequestSender) {
        this._sender = sender;
    }

    handleAsync(command: SendClientRequestCommand): Promise<Result<ClientExchangeResponse>> {
        return this._sender.sendAsync(command.request);
    }
}
