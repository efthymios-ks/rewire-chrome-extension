import { getOrCreate } from '../../../Common/Collections/getOrCreate';
import { BoundedMap } from '../../Core/BoundedMap';
import type { DebuggerSessions, RememberOptions } from './DebuggerSessions';
import { MAX_ROUTES_PER_TAB } from './MaxRoutesPerTab';

export class DefaultDebuggerSessions implements DebuggerSessions {
    private readonly _children = new Map<number, Set<string>>();
    private readonly _routes = new Map<number, Map<string, string>>();

    addChild(tabId: number, sessionId: string): void {
        getOrCreate({
            map: this._children,
            key: tabId,
            create: () => new Set<string>(),
        }).add(sessionId);
    }

    removeChild(tabId: number, sessionId: string): void {
        this._children.get(tabId)?.delete(sessionId);
        const routes = this._routes.get(tabId);
        if (routes == null) {
            return;
        }

        [...routes.entries()]
            .filter(([, routedSessionId]) => routedSessionId === sessionId)
            .forEach(([requestId]) => routes.delete(requestId));
    }

    childrenOf(tabId: number): string[] {
        return [...this._children.get(tabId) ?? []];
    }

    remember({ tabId, requestId, sessionId }: RememberOptions): void {
        getOrCreate({
            map: this._routes,
            key: tabId,
            create: () => new BoundedMap<string, string>(MAX_ROUTES_PER_TAB),
        }).set(requestId, sessionId);
    }

    sessionOf(tabId: number, requestId: string): string | undefined {
        return this._routes.get(tabId)?.get(requestId);
    }

    forget(tabId: number): void {
        this._children.delete(tabId);
        this._routes.delete(tabId);
    }
}
