import { ErrorText } from '../../Common/Errors/ErrorText';
import { Result } from '../../Common/Results/Result';
import type { PanelCommand, PanelCommandOf } from '../../Contracts/Messaging/PanelCommand';
import type { PanelCommandType } from '../../Contracts/Messaging/PanelCommandType';
import type { PanelRequest } from '../../Contracts/Messaging/PanelRequest';
import type { PanelEndpoint } from './PanelEndpoint';
import type { PanelEndpointContext } from './PanelEndpointContext';

type UntypedEndpoint = (command: PanelCommand, context: PanelEndpointContext) => Promise<Result<unknown>>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value != null;
}

export class PanelEndpointRouter {
    private readonly _endpoints = new Map<PanelCommandType, UntypedEndpoint>();

    register<TCommandType extends PanelCommandType>(endpoint: PanelEndpoint<TCommandType>): this {
        this._endpoints.set(
            /* key: */ endpoint.commandType,
            /* value: */ (command, context) => endpoint.handleAsync(
                /* command: */ command as PanelCommandOf<TCommandType>,
                /* context: */ context,
            ),
        );

        return this;
    }

    isPanelRequest(message: unknown): message is PanelRequest {
        return isRecord(message)
            && typeof message['correlationId'] === 'string'
            && isRecord(message['command'])
            && typeof message['command']['type'] === 'number';
    }

    async routeAsync(request: PanelRequest, context: PanelEndpointContext): Promise<Result<unknown>> {
        const endpoint = this._endpoints.get(request.command.type);
        if (endpoint == null) {
            return Result.fail(`No endpoint handles command ${request.command.type}.`);
        }

        try {
            return await endpoint(request.command, context);
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    }
}
