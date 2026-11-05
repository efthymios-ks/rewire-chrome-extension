import type { Result } from "../../Common/Results/Result";
import type { PanelCommandOf } from "../../Contracts/Messaging/PanelCommand";
import type { PanelCommandResults } from "../../Contracts/Messaging/PanelCommandResults";
import type { PanelCommandType } from "../../Contracts/Messaging/PanelCommandType";
import type { PanelEndpointContext } from "./PanelEndpointContext";

export interface IPanelEndpoint<TCommandType extends PanelCommandType> {
    readonly commandType: TCommandType;
    handle(
        command: PanelCommandOf<TCommandType>,
        context: PanelEndpointContext
    ): Promise<Result<PanelCommandResults[TCommandType]>>;
}
