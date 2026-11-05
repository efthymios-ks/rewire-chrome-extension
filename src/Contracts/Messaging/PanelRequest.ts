import type { PanelCommand } from "./PanelCommand";

export interface PanelRequest {
    correlationId: string;
    command: PanelCommand;
}
