import { Result } from "../../../Common/Results/Result";
import type { InspectTabCommand } from "../../../Contracts/Messaging/Commands/InspectTabCommand";
import type { InspectTabResult } from "../../../Contracts/Messaging/PanelCommandResults";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { ITimelineStore } from "../../Features/Capture/ITimelineStore";
import type { IInspectionService } from "../../Features/Inspection/IInspectionService";
import type { ILiveStore } from "../../Features/Live/LiveStore";
import type { IPanelEndpoint } from "../IPanelEndpoint";
import type { PanelEndpointContext } from "../PanelEndpointContext";

export class InspectTabEndpoint implements IPanelEndpoint<PanelCommandType.InspectTab> {
    readonly commandType = PanelCommandType.InspectTab;

    private readonly _inspectionService: IInspectionService;
    private readonly _timelineStore: ITimelineStore;
    private readonly _liveStore: ILiveStore;

    constructor(
        inspectionService: IInspectionService,
        timelineStore: ITimelineStore,
        liveStore: ILiveStore
    ) {
        this._inspectionService = inspectionService;
        this._timelineStore = timelineStore;
        this._liveStore = liveStore;
    }

    async handle(command: InspectTabCommand, context: PanelEndpointContext): Promise<Result<InspectTabResult>> {
        await this._inspectionService.inspect(context.connection.id, command.tabId);

        return Result.ok({
            status: this._inspectionService.statusOf(command.tabId),
            entries: this._timelineStore.list(command.tabId),
            live: this._liveStore.snapshot(command.tabId),
        });
    }
}
