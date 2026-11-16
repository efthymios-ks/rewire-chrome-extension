import { afterEach, describe, expect, test, vi } from 'vitest';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { ChromeHandshakeHeaderRules } from './ChromeHandshakeHeaderRules';

const SOCKET_URL = 'wss://live.example.com/socket';
const WINDOW_ID = 3;
const FIRST_OWN_ID = 1_003_000;
const BLOCK_SIZE = 1000;

function headers(): HeaderEntry[] {
    return [
        {
            name: 'Authorization',
            value: 'Bearer abc',
        },
    ];
}

interface StubChromeOptions {
    sessionRuleIds?: number[];
    windowId?: number;
    liveWindowIds?: number[];
}

function stubChrome({
    sessionRuleIds = [],
    windowId = WINDOW_ID,
    liveWindowIds = [WINDOW_ID],
}: StubChromeOptions = {}) {
    const updateSessionRules = vi.fn().mockResolvedValue(undefined);
    const getSessionRules = vi.fn().mockResolvedValue(sessionRuleIds.map(id => ({ id })));
    const getCurrent = vi.fn().mockResolvedValue({ id: windowId });
    const getAll = vi.fn().mockResolvedValue(liveWindowIds.map(id => ({ id })));
    vi.stubGlobal('chrome', {
        declarativeNetRequest: {
            updateSessionRules,
            getSessionRules,
        },
        windows: {
            getCurrent,
            getAll,
        },
    });

    return {
        updateSessionRules,
        getSessionRules,
        getCurrent,
        getAll,
    };
}

type UpdateRuleOptions = chrome.declarativeNetRequest.UpdateRuleOptions;

function updatesOf(updateSessionRules: ReturnType<typeof vi.fn>): UpdateRuleOptions[] {
    return updateSessionRules.mock.calls.map(([options]) => options as UpdateRuleOptions);
}

function addedRulesOf(updateSessionRules: ReturnType<typeof vi.fn>): chrome.declarativeNetRequest.Rule[] {
    return updatesOf(updateSessionRules).flatMap(options => options.addRules ?? []);
}

function removedIdsOf(updateSessionRules: ReturnType<typeof vi.fn>): number[] {
    return updatesOf(updateSessionRules).flatMap(options => options.removeRuleIds ?? []);
}

function rulesOf(ids: number[]): Array<{ id: number }> {
    return ids.map(id => ({ id }));
}

describe('ChromeHandshakeHeaderRules', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('addAsync_WhenHeadersAreGiven_ShouldSetThemOnThatSocketUrlOnly', async () => {
        // Arrange
        const { updateSessionRules } = stubChrome();
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        const added = await rules.addAsync(SOCKET_URL, headers());

        // Assert
        expect(added).toEqual({
            hasErrors: false,
            value: FIRST_OWN_ID,
        });
        expect(updateSessionRules).toHaveBeenLastCalledWith({
            addRules: [
                {
                    id: FIRST_OWN_ID,
                    priority: 1,
                    action: {
                        type: 'modifyHeaders',
                        requestHeaders: [
                            {
                                header: 'Authorization',
                                operation: 'set',
                                value: 'Bearer abc',
                            },
                        ],
                    },
                    condition: {
                        urlFilter: '|wss://live.example.com/socket|',
                        resourceTypes: ['websocket'],
                        tabIds: [-1],
                    },
                },
            ],
        });
    });

    test('addAsync_WhenTheUrlIsABareHost_ShouldMatchTheSlashChromeAdds', async () => {
        // Arrange
        const { updateSessionRules } = stubChrome();
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        await rules.addAsync('wss://Live.Example.com', headers());

        // Assert
        expect(addedRulesOf(updateSessionRules).map(rule => rule.condition.urlFilter))
            .toEqual(['|wss://live.example.com/|']);
    });

    test('addAsync_WhenTheUrlIsInvalid_ShouldFailWithoutAddingARule', async () => {
        // Arrange
        const { updateSessionRules } = stubChrome();
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        const added = await rules.addAsync('not a url', headers());

        // Assert
        expect(added.hasErrors).toBe(true);
        expect(addedRulesOf(updateSessionRules)).toEqual([]);
    });

    test('addAsync_WhenStartAsyncHasNotRun_ShouldRemoveTheWindowLeftoversFirst', async () => {
        // Arrange
        const { updateSessionRules, getSessionRules } = stubChrome();
        getSessionRules
            .mockResolvedValueOnce(rulesOf([FIRST_OWN_ID]))
            .mockResolvedValueOnce([]);
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        const added = await rules.addAsync(SOCKET_URL, headers());

        // Assert
        expect(updateSessionRules.mock.calls[0]?.[0]).toEqual({
            removeRuleIds: [FIRST_OWN_ID],
        });
        expect(added).toEqual({
            hasErrors: false,
            value: FIRST_OWN_ID,
        });
    });

    test('addAsync_WhenTheWindowHoldsOpenSockets_ShouldTakeTheNextFreeIdOfItsBlock', async () => {
        // Arrange
        const { getSessionRules } = stubChrome();
        getSessionRules
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(rulesOf([FIRST_OWN_ID]));
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        const first = await rules.addAsync(SOCKET_URL, headers());
        const second = await rules.addAsync(SOCKET_URL, headers());

        // Assert
        expect([
            first,
            second,
        ]).toEqual([
            {
                hasErrors: false,
                value: FIRST_OWN_ID,
            },
            {
                hasErrors: false,
                value: FIRST_OWN_ID + 1,
            },
        ]);
    });

    test('addAsync_WhenTwoSocketsConnectAtOnce_ShouldGiveThemDifferentIds', async () => {
        // Arrange
        stubChrome();
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        const added = await Promise.all([
            rules.addAsync(SOCKET_URL, headers()),
            rules.addAsync(SOCKET_URL, headers()),
        ]);

        // Assert
        expect(added.map(result => result.hasErrors ? null : result.value)).toEqual([
            FIRST_OWN_ID,
            FIRST_OWN_ID + 1,
        ]);
    });

    test('addAsync_WhenAnotherOpenWindowHoldsSocketRules_ShouldLeaveThemInPlace', async () => {
        // Arrange
        const { updateSessionRules } = stubChrome({
            sessionRuleIds: [1_005_000],
            liveWindowIds: [
                WINDOW_ID,
                5,
            ],
        });
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        const added = await rules.addAsync(SOCKET_URL, headers());

        // Assert
        expect(removedIdsOf(updateSessionRules)).toEqual([]);
        expect(added).toEqual({
            hasErrors: false,
            value: FIRST_OWN_ID,
        });
    });

    test('addAsync_WhenAWindowClosedWithAnOpenSocket_ShouldRemoveItsRuleWhileAddingTheNewOne', async () => {
        // Arrange
        const { updateSessionRules, getSessionRules } = stubChrome();
        getSessionRules
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(rulesOf([1_009_000]));
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        await rules.addAsync(SOCKET_URL, headers());

        // Assert
        expect(updatesOf(updateSessionRules)).toEqual([
            expect.objectContaining({
                removeRuleIds: [1_009_000],
                addRules: [
                    expect.objectContaining({
                        id: FIRST_OWN_ID,
                    }),
                ],
            }),
        ]);
    });

    test('addAsync_WhenTheWindowIdIsPastTheBlockCount_ShouldWrapIntoTheReservedRange', async () => {
        // Arrange
        stubChrome({
            windowId: 2_000_005,
            liveWindowIds: [2_000_005],
        });
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        const added = await rules.addAsync(SOCKET_URL, headers());

        // Assert
        expect(added).toEqual({
            hasErrors: false,
            value: 1_005_000,
        });
    });

    test('addAsync_WhenTheWindowBlockIsFull_ShouldFailWithoutAddingARule', async () => {
        // Arrange
        const { updateSessionRules, getSessionRules } = stubChrome();
        const fullBlock = Array.from({ length: BLOCK_SIZE }, (_, offset) => FIRST_OWN_ID + offset);
        getSessionRules
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(rulesOf(fullBlock));
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        const added = await rules.addAsync(SOCKET_URL, headers());

        // Assert
        expect(added).toEqual({
            hasErrors: true,
            error: "Can't set the handshake headers: "
                + 'this window already has 1,000 sockets with handshake headers.',
        });
        expect(addedRulesOf(updateSessionRules)).toEqual([]);
    });

    test('startAsync_WhenRulesAreLeftBehind_ShouldRemoveOnlyThoseOfThisWindowAndOfClosedOnes', async () => {
        // Arrange
        const { updateSessionRules } = stubChrome({
            sessionRuleIds: [
                7,
                FIRST_OWN_ID + 2,
                1_005_000,
                1_009_000,
            ],
            liveWindowIds: [
                WINDOW_ID,
                5,
            ],
        });
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        await rules.startAsync();

        // Assert
        expect(updateSessionRules).toHaveBeenCalledExactlyOnceWith({
            removeRuleIds: [
                FIRST_OWN_ID + 2,
                1_009_000,
            ],
        });
    });

    test('startAsync_WhenAnotherOpenWindowSharesTheBlock_ShouldKeepItsRules', async () => {
        // Arrange
        const { updateSessionRules } = stubChrome({
            sessionRuleIds: [FIRST_OWN_ID],
            liveWindowIds: [
                WINDOW_ID,
                1_000_003,
            ],
        });
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        await rules.startAsync();

        // Assert
        expect(updateSessionRules).not.toHaveBeenCalled();
    });

    test('startAsync_WhenTheWindowListFails_ShouldRemoveOnlyTheLeftoversOfThisWindow', async () => {
        // Arrange
        const { updateSessionRules, getAll } = stubChrome({
            sessionRuleIds: [
                FIRST_OWN_ID,
                1_009_000,
            ],
        });
        getAll.mockRejectedValue(new Error('No windows'));
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        await rules.startAsync();

        // Assert
        expect(updateSessionRules).toHaveBeenCalledExactlyOnceWith({
            removeRuleIds: [FIRST_OWN_ID],
        });
    });

    test('startAsync_WhenNoRulesAreLeft_ShouldNotTouchTheSessionRules', async () => {
        // Arrange
        const { updateSessionRules } = stubChrome({
            sessionRuleIds: [7],
        });
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        await rules.startAsync();

        // Assert
        expect(updateSessionRules).not.toHaveBeenCalled();
    });

    test('startAsync_WhenCalledTwice_ShouldCleanUpOnce', async () => {
        // Arrange
        const { getSessionRules } = stubChrome();
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        await rules.startAsync();
        await rules.startAsync();

        // Assert
        expect(getSessionRules).toHaveBeenCalledOnce();
    });

    test('startAsync_WhenChromeFails_ShouldStillLetSocketsConnect', async () => {
        // Arrange
        const { getSessionRules } = stubChrome();
        getSessionRules.mockRejectedValueOnce(new Error('No access'));
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        await rules.startAsync();
        const added = await rules.addAsync(SOCKET_URL, headers());

        // Assert
        expect(added).toEqual({
            hasErrors: false,
            value: FIRST_OWN_ID,
        });
    });

    test('removeAsync_WhenTheSocketCloses_ShouldRemoveTheRule', async () => {
        // Arrange
        const { updateSessionRules } = stubChrome();
        const rules = new ChromeHandshakeHeaderRules();

        // Act
        await rules.removeAsync(FIRST_OWN_ID);

        // Assert
        expect(updateSessionRules).toHaveBeenCalledWith({
            removeRuleIds: [FIRST_OWN_ID],
        });
    });
});
