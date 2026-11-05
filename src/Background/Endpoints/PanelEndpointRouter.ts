import { Result } from "../../Common/Results/Result";
import type { PanelCommand, PanelCommandOf } from "../../Contracts/Messaging/PanelCommand";
import type { PanelCommandType } from "../../Contracts/Messaging/PanelCommandType";
import type { PanelRequest } from "../../Contracts/Messaging/PanelRequest";
import type { IPanelEndpoint } from "./IPanelEndpoint";
import type { PanelEndpointContext } from "./PanelEndpointContext";

type UntypedEndpoint = (command: PanelCommand, context: PanelEndpointContext) => Promise<Result<unknown>>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export class PanelEndpointRouter {
    private readonly _endpoints = new Map<PanelCommandType, UntypedEndpoint>();

    register<TCommandType extends PanelCommandType>(endpoint: IPanelEndpoint<TCommandType>): this {
        this._endpoints.set(
            endpoint.commandType,
            (command, context) => endpoint.handle(command as PanelCommandOf<TCommandType>, context)
        );

        return this;
    }

    isPanelRequest(message: unknown): message is PanelRequest {
        return isRecord(message)
            && typeof message["correlationId"] === "string"
            && isRecord(message["command"])
            && typeof message["command"]["type"] === "number";
    }

    async route(request: PanelRequest, context: PanelEndpointContext): Promise<Result<unknown>> {
        const endpoint = this._endpoints.get(request.command.type);
        if (endpoint === undefined) {
            return Result.fail(`No endpoint handles command ${request.command.type}.`);
        }

        return endpoint(request.command, context);
    }
}
