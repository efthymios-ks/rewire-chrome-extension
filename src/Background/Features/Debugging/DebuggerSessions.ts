export interface RememberOptions {
    tabId: number;
    requestId: string;
    sessionId: string;
}

export interface DebuggerSessions {
    addChild(tabId: number, sessionId: string): void;
    removeChild(tabId: number, sessionId: string): void;
    childrenOf(tabId: number): string[];
    remember(options: RememberOptions): void;
    sessionOf(tabId: number, requestId: string): string | undefined;
    forget(tabId: number): void;
}
