import { Result } from "../../../Common/Results/Result";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { IPanelEndpoint } from "../IPanelEndpoint";

export class KeepAliveEndpoint implements IPanelEndpoint<PanelCommandType.KeepAlive> {
    readonly commandType = PanelCommandType.KeepAlive;

    async handle(): Promise<Result<void>> {
        return Result.done();
    }
}
