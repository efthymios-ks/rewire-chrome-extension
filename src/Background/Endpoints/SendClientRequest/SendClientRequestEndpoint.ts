import type { Result } from "../../../Common/Results/Result";
import type { ClientExchangeResponse } from "../../../Contracts/Messaging/Commands/LogClientExchangeCommand";
import type { SendClientRequestCommand } from "../../../Contracts/Messaging/Commands/SendClientRequestCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { IClientRequestSender } from "../../Features/ClientSending/ClientRequestSender";
import type { IPanelEndpoint } from "../IPanelEndpoint";

export class SendClientRequestEndpoint implements IPanelEndpoint<PanelCommandType.SendClientRequest> {
    readonly commandType = PanelCommandType.SendClientRequest;

    private readonly _sender: IClientRequestSender;

    constructor(sender: IClientRequestSender) {
        this._sender = sender;
    }

    handle(command: SendClientRequestCommand): Promise<Result<ClientExchangeResponse>> {
        return this._sender.send(command.request);
    }
}
