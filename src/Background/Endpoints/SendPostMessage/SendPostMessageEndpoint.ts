import type { Result } from "../../../Common/Results/Result";
import type { SendPostMessageCommand } from "../../../Contracts/Messaging/Commands/SendPostMessageCommand";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { IPostMessageSender } from "../../Features/PostMessages/PostMessageSender";
import type { IPanelEndpoint } from "../IPanelEndpoint";

export class SendPostMessageEndpoint implements IPanelEndpoint<PanelCommandType.SendPostMessage> {
    readonly commandType = PanelCommandType.SendPostMessage;

    private readonly _sender: IPostMessageSender;

    constructor(sender: IPostMessageSender) {
        this._sender = sender;
    }

    async handle(command: SendPostMessageCommand): Promise<Result<void>> {
        return this._sender.send(
            command.tabId,
            command.target,
            command.data
        );
    }
}
