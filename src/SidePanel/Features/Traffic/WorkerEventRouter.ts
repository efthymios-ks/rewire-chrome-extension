import type { WorkerEvent, WorkerEventOf } from "../../../Contracts/Messaging/WorkerEvent";
import type { WorkerEventType } from "../../../Contracts/Messaging/WorkerEventType";

type UntypedHandler = (event: WorkerEvent) => void;

export class WorkerEventRouter {
    private readonly _handlers = new Map<WorkerEventType, UntypedHandler>();

    on<TEventType extends WorkerEventType>(eventType: TEventType, handler: (event: WorkerEventOf<TEventType>) => void): this {
        this._handlers.set(eventType, event => handler(event as WorkerEventOf<TEventType>));

        return this;
    }

    route(event: WorkerEvent): void {
        this._handlers.get(event.type)?.(event);
    }
}
