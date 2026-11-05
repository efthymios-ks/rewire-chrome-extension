import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import type { InspectorTabId } from "../../Core/InspectorTabId";
import type { PanelState } from "../../Core/PanelState";

export interface IInspectorTab {
    id: InspectorTabId;
    label: string;
    keyOf(state: PanelState, detail: TimelineEntryDetail): string;
    render(detail: TimelineEntryDetail, state: PanelState): HTMLElement;
}
