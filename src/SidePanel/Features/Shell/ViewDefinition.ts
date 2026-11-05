import type { PanelState } from "../../Core/PanelState";
import type { ViewId } from "../../Core/ViewId";
import type { PanelContext } from "./PanelContext";

export interface ViewDefinition {
    id: ViewId;
    label: string;
    badgeOf(state: PanelState): string;
    create(context: PanelContext): HTMLElement;
}
