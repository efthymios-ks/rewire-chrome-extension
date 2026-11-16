import { ClientBodies } from './ClientBodies';
import type { ClientBody } from './ClientBody';
import type { ClientRequest } from './ClientRequest';

type DebuggerReason = (request: ClientRequest) => boolean;

const BROWSER_DROPPED_HEADER_NAMES = [
    'cookie',
    'origin',
    'referer',
    'user-agent',
];

const DEBUGGER_REASONS: DebuggerReason[] = [
    request => ClientBodies.dropsBody(request.method, request.body),
    request => request.headers.some(
        header => BROWSER_DROPPED_HEADER_NAMES.includes(header.name.trim().toLowerCase())
            && header.value !== '',
    ),
];

export const ClientRoutes = {
    needsDebugger(request: ClientRequest): boolean {
        return DEBUGGER_REASONS.some(reason => reason(request));
    },

    bodySent(request: ClientRequest): ClientBody {
        return ClientRoutes.needsDebugger(request)
            ? request.body
            : ClientBodies.sentWith(request.method, request.body);
    },
};
