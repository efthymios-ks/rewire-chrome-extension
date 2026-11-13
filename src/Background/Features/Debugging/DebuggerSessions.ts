export const MaxRoutesPerTab = 5000;

export interface IDebuggerSessions {
    addChild(tabId: number, sessionId: string): void;
    removeChild(tabId: number, sessionId: string): void;
    childrenOf(tabId: number): string[];
    remember(
        tabId: number,
        requestId: string,
        sessionId: string
    ): void;
    sessionOf(tabId: number, requestId: string): string | undefined;
    forget(tabId: number): void;
}

export class DebuggerSessions implements IDebuggerSessions {
    private readonly _children = new Map<number, Set<string>>();
    private readonly _routes = new Map<number, Map<string, string>>();

    addChild(tabId: number, sessionId: string): void {
        const children = this._children.get(tabId) ?? new Set<string>();
        children.add(sessionId);
        this._children.set(tabId, children);
    }

    removeChild(tabId: number, sessionId: string): void {
        this._children.get(tabId)?.delete(sessionId);
        const routes = this._routes.get(tabId);
        if (routes === undefined) {
            return;
        }

        [...routes.entries()]
            .filter(([, routedSessionId]) => routedSessionId === sessionId)
            .forEach(([requestId]) => routes.delete(requestId));
    }

    childrenOf(tabId: number): string[] {
        return [...this._children.get(tabId) ?? []];
    }

    remember(
        tabId: number,
        requestId: string,
        sessionId: string
    ): void {
        const routes = this._routes.get(tabId) ?? new Map<string, string>();
        routes.set(requestId, sessionId);
        this._routes.set(tabId, routes);
        if (routes.size <= MaxRoutesPerTab) {
            return;
        }

        const oldest = routes.keys().next().value;
        if (oldest !== undefined) {
            routes.delete(oldest);
        }
    }

    sessionOf(tabId: number, requestId: string): string | undefined {
        return this._routes.get(tabId)?.get(requestId);
    }

    forget(tabId: number): void {
        this._children.delete(tabId);
        this._routes.delete(tabId);
    }
}
