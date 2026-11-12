import type { ClearTimelineCommand } from "./Commands/ClearTimelineCommand";
import type { GetEntryDetailCommand } from "./Commands/GetEntryDetailCommand";
import type { GetTimelineDetailsCommand } from "./Commands/GetTimelineDetailsCommand";
import type { InspectTabCommand } from "./Commands/InspectTabCommand";
import type { KeepAliveCommand } from "./Commands/KeepAliveCommand";
import type { LogClientExchangeCommand } from "./Commands/LogClientExchangeCommand";
import type { SearchTimelineCommand } from "./Commands/SearchTimelineCommand";
import type { SendClientRequestCommand } from "./Commands/SendClientRequestCommand";
import type { PanelCommandType } from "./PanelCommandType";

export type PanelCommand =
    | InspectTabCommand
    | GetEntryDetailCommand
    | ClearTimelineCommand
    | KeepAliveCommand
    | SearchTimelineCommand
    | LogClientExchangeCommand
    | GetTimelineDetailsCommand
    | SendClientRequestCommand;

export type PanelCommandOf<TCommandType extends PanelCommandType> = Extract<PanelCommand, { type: TCommandType }>;
