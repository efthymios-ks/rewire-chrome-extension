import type { HeaderEntry } from "../../Timeline/HeaderEntry";
import type { PanelCommandType } from "../PanelCommandType";

export interface ClientExchangeRequest {
    method: string;
    url: string;
    headers: HeaderEntry[];
    body: string;
}

export interface ClientExchangeResponse {
    status: number;
    statusText: string;
    headers: HeaderEntry[];
    body: string;
    durationInMilliseconds: number;
}

export interface LogClientExchangeCommand {
    type: PanelCommandType.LogClientExchange;
    entryId: string;
    tabId: number;
    startedAt: string;
    request: ClientExchangeRequest;
    response: ClientExchangeResponse | null;
    error: string | null;
}
