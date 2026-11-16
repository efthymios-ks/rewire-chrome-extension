import type { Result } from '../../../Common/Results/Result';
import type { SendPostMessageCommand } from '../../../Contracts/Messaging/Commands/SendPostMessageCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { PostMessageSender } from '../../Features/PostMessages/PostMessageSender';
import type { PanelEndpoint } from '../PanelEndpoint';

export class SendPostMessageEndpoint implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.SendPostMessage> {
    readonly commandType = PANEL_COMMAND_TYPE.SendPostMessage;

    private readonly _sender: PostMessageSender;

    constructor(sender: PostMessageSender) {
        this._sender = sender;
    }

    async handleAsync(command: SendPostMessageCommand): Promise<Result<void>> {
        return this._sender.sendAsync({ tabId: command.tabId, target: command.target, data: command.data });
    }
}
