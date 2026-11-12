import { ClientBodies } from "./ClientBodies";
import type { ClientBody, ClientRequest } from "./ClientRequest";

type DebuggerReason = (request: ClientRequest) => boolean;

const BrowserDroppedHeaderNames = [
    "cookie",
    "origin",
    "referer",
    "user-agent",
];

const DebuggerReasons: DebuggerReason[] = [
    request => ClientBodies.dropsBody(request.method, request.body),
    request => request.headers.some(header => BrowserDroppedHeaderNames.includes(header.name.trim().toLowerCase()) && header.value !== ""),
];

export const ClientRoutes = {
    needsDebugger(request: ClientRequest): boolean {
        return DebuggerReasons.some(reason => reason(request));
    },

    bodySent(request: ClientRequest): ClientBody {
        return ClientRoutes.needsDebugger(request) ? request.body : ClientBodies.sentWith(request.method, request.body);
    },
};
