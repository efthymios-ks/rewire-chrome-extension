import { Result } from '../../../Common/Results/Result';
import type { InspectTabCommand } from '../../../Contracts/Messaging/Commands/InspectTabCommand';
import type { InspectTabResult } from '../../../Contracts/Messaging/InspectTabResult';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { TimelineStore } from '../../Features/Capture/TimelineStore';
import type { InspectionService } from '../../Features/Inspection/InspectionService';
import type { LiveStore } from '../../Features/Live/LiveStore';
import type { PanelEndpoint } from '../PanelEndpoint';
import type { PanelEndpointContext } from '../PanelEndpointContext';

export interface InspectTabEndpointDependencies {
    inspectionService: InspectionService;
    timelineStore: TimelineStore;
    liveStore: LiveStore;
}

export class InspectTabEndpoint implements PanelEndpoint<typeof PANEL_COMMAND_TYPE.InspectTab> {
    readonly commandType = PANEL_COMMAND_TYPE.InspectTab;

    private readonly _inspectionService: InspectionService;
    private readonly _timelineStore: TimelineStore;
    private readonly _liveStore: LiveStore;

    constructor({ inspectionService, timelineStore, liveStore }: InspectTabEndpointDependencies) {
        this._inspectionService = inspectionService;
        this._timelineStore = timelineStore;
        this._liveStore = liveStore;
    }

    async handleAsync(
        command: InspectTabCommand,
        context: PanelEndpointContext,
    ): Promise<Result<InspectTabResult>> {
        await this._inspectionService.inspectAsync(context.connection.id, command.tabId);

        return Result.ok({
            status: this._inspectionService.statusOf(command.tabId),
            entries: this._timelineStore.list(command.tabId),
            live: this._liveStore.snapshot(command.tabId),
        });
    }
}
