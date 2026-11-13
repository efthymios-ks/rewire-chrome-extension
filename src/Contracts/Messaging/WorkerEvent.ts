import type { ChannelUpsertedEvent } from "./Events/ChannelUpsertedEvent";
import type { CommandCompletedEvent } from "./Events/CommandCompletedEvent";
import type { EntryRemovedEvent } from "./Events/EntryRemovedEvent";
import type { EntryUpsertedEvent } from "./Events/EntryUpsertedEvent";
import type { InspectionChangedEvent } from "./Events/InspectionChangedEvent";
import type { LiveMessageAddedEvent } from "./Events/LiveMessageAddedEvent";
import type { PostMessageAddedEvent } from "./Events/PostMessageAddedEvent";
import type { TimelineClearedEvent } from "./Events/TimelineClearedEvent";
import type { WorkerEventType } from "./WorkerEventType";

export type WorkerEvent =
    | CommandCompletedEvent
    | EntryUpsertedEvent
    | TimelineClearedEvent
    | InspectionChangedEvent
    | ChannelUpsertedEvent
    | LiveMessageAddedEvent
    | PostMessageAddedEvent
    | EntryRemovedEvent;

export type WorkerEventOf<TEventType extends WorkerEventType> = Extract<WorkerEvent, { type: TEventType }>;
