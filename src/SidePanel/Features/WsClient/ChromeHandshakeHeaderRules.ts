import { Result } from '../../../Common/Results/Result';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { HandshakeHeaderRules } from './HandshakeHeaderRules';

// Each panel window takes its own block of ids, so a panel never clears another window's socket rules.
const FIRST_RULE_ID = 1_000_000;
const BLOCK_SIZE = 1000;
const BLOCK_COUNT = 1_000_000;
const RULE_PRIORITY = 1;
const NO_TAB_ID = -1;
const NUMBER_LOCALE = 'en-US';
const FULL_BLOCK_TEXT = `this window already has ${BLOCK_SIZE.toLocaleString(NUMBER_LOCALE)} sockets `
    + 'with handshake headers.';
const UNKNOWN_WINDOW_TEXT = "can't tell which window the panel is in.";
const ALL_WINDOW_TYPES: `${chrome.windows.WindowType}`[] = [
    'normal',
    'popup',
    'panel',
    'app',
    'devtools',
];

function isReservedId(ruleId: number): boolean {
    return ruleId >= FIRST_RULE_ID;
}

function blockOfRule(ruleId: number): number {
    return Math.floor((ruleId - FIRST_RULE_ID) / BLOCK_SIZE);
}

function blockOfWindow(windowId: number): number {
    return windowId % BLOCK_COUNT;
}

async function reservedIdsAsync(): Promise<number[]> {
    const rules = await chrome.declarativeNetRequest.getSessionRules();

    return rules
        .map(rule => rule.id)
        .filter(isReservedId);
}

async function liveWindowIdsAsync(): Promise<number[] | null> {
    try {
        const windows = await chrome.windows.getAll({
            windowTypes: ALL_WINDOW_TYPES,
        });

        return windows
            .map(browserWindow => browserWindow.id)
            .filter(windowId => windowId != null);
    } catch {
        return null;
    }
}

interface StaleIdsOptions {
    reservedIds: number[];
    windowId: number;
    liveWindowIds: number[] | null;
}

// Before the panel opens a socket, its own block holds only leftovers.
function staleIdsAtStartOf({ reservedIds, windowId, liveWindowIds }: StaleIdsOptions): number[] {
    if (liveWindowIds == null) {
        return reservedIds.filter(ruleId => blockOfRule(ruleId) === blockOfWindow(windowId));
    }

    const otherBlocks = new Set(liveWindowIds
        .filter(liveWindowId => liveWindowId !== windowId)
        .map(blockOfWindow));

    return reservedIds.filter(ruleId => !otherBlocks.has(blockOfRule(ruleId)));
}

function orphanIdsOf({ reservedIds, windowId, liveWindowIds }: StaleIdsOptions): number[] {
    if (liveWindowIds == null) {
        return [];
    }

    const liveBlocks = new Set([
        windowId,
        ...liveWindowIds,
    ].map(blockOfWindow));

    return reservedIds.filter(ruleId => !liveBlocks.has(blockOfRule(ruleId)));
}

export class ChromeHandshakeHeaderRules implements HandshakeHeaderRules {
    private _start: Promise<void> | null = null;
    private _windowId: number | null = null;
    private _nextOffset = 0;

    startAsync(): Promise<void> {
        this._start ??= this.removeLeftoversAsync();

        return this._start;
    }

    async addAsync(url: string, headers: HeaderEntry[]): Promise<Result<number>> {
        await this.startAsync();

        return Result.attemptAsync(
            /* action: */ async () => {
                const urlFilter = `|${new URL(url).href}|`;
                const windowId = await this.windowIdAsync();
                const reservedIds = await reservedIdsAsync();
                const liveWindowIds = await liveWindowIdsAsync();
                const ruleId = this.nextIdOf(windowId, reservedIds);
                const orphanIds = orphanIdsOf({ reservedIds, windowId, liveWindowIds });
                await chrome.declarativeNetRequest.updateSessionRules({
                    ...(orphanIds.length === 0
                        ? {}
                        : {
                            removeRuleIds: orphanIds,
                        }),
                    addRules: [
                        {
                            id: ruleId,
                            priority: RULE_PRIORITY,
                            action: {
                                type: 'modifyHeaders',
                                requestHeaders: headers.map(header => ({
                                    header: header.name,
                                    operation: 'set',
                                    value: header.value,
                                })),
                            },
                            condition: {
                                urlFilter,
                                resourceTypes: ['websocket'],
                                tabIds: [NO_TAB_ID],
                            },
                        },
                    ],
                });

                return ruleId;
            },
            /* failurePrefix: */ "Can't set the handshake headers",
        );
    }

    async removeAsync(ruleId: number): Promise<void> {
        try {
            await chrome.declarativeNetRequest.updateSessionRules({
                removeRuleIds: [ruleId],
            });
        } catch {
            return;
        }
    }

    private async removeLeftoversAsync(): Promise<void> {
        try {
            const windowId = await this.windowIdAsync();
            const staleIds = staleIdsAtStartOf({
                reservedIds: await reservedIdsAsync(),
                windowId,
                liveWindowIds: await liveWindowIdsAsync(),
            });
            if (staleIds.length === 0) {
                return;
            }

            await chrome.declarativeNetRequest.updateSessionRules({
                removeRuleIds: staleIds,
            });
        } catch {
            return;
        }
    }

    private async windowIdAsync(): Promise<number> {
        if (this._windowId != null) {
            return this._windowId;
        }

        const browserWindow = await chrome.windows.getCurrent();
        if (browserWindow.id == null) {
            throw new Error(UNKNOWN_WINDOW_TEXT);
        }

        this._windowId = browserWindow.id;

        return browserWindow.id;
    }

    // Runs without awaiting, so sockets connecting at once still get different ids.
    private nextIdOf(windowId: number, reservedIds: number[]): number {
        const firstId = FIRST_RULE_ID + blockOfWindow(windowId) * BLOCK_SIZE;
        const usedIds = new Set(reservedIds);
        const offset = Array
            .from({ length: BLOCK_SIZE }, (_, step) => (this._nextOffset + step) % BLOCK_SIZE)
            .find(candidate => !usedIds.has(firstId + candidate));
        if (offset == null) {
            throw new Error(FULL_BLOCK_TEXT);
        }

        this._nextOffset = offset + 1;

        return firstId + offset;
    }
}
