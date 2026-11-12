import type { HeaderEntry } from "../../Timeline/HeaderEntry";
import type { PanelCommandType } from "../PanelCommandType";

export interface SentClientRequest {
    method: string;
    url: string;
    headers: HeaderEntry[];
    bodyBase64: string | null;
}

export interface SendClientRequestCommand {
    type: PanelCommandType.SendClientRequest;
    request: SentClientRequest;
}
