import type { HeaderEntry } from '../../Timeline/HeaderEntry';
import type { PANEL_COMMAND_TYPE } from '../PanelCommandType';
import type { ClientExchangeResponse } from './ClientExchangeResponse';

export interface ClientExchangeRequest {
    method: string;
    url: string;
    headers: HeaderEntry[];
    body: string;
}

export interface LogClientExchangeCommand {
    type: typeof PANEL_COMMAND_TYPE.LogClientExchange;
    entryId: string;
    tabId: number;
    startedAt: string;
    request: ClientExchangeRequest;
    response: ClientExchangeResponse | null;
    error: string | null;
}
