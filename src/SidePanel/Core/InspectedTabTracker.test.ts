import { afterEach, describe, expect, test, vi } from 'vitest';
import { InspectedTabTracker, type InspectedTabListener } from './InspectedTabTracker';
import { createLogger, nextTaskAsync } from '../../TestData';

const WINDOW_ID = 3;
const OTHER_WINDOW_ID = 4;
const WINDOW_ID_CURRENT = -2;

type ActivatedListener = (activeInfo: chrome.tabs.OnActivatedInfo) => void;
type UpdatedListener = (
    tabId: number,
    changeInfo: chrome.tabs.OnUpdatedInfo,
    tab: chrome.tabs.Tab,
) => void;

interface ChromeStubOptions {
    tabs?: Partial<chrome.tabs.Tab>[];
    query?: ReturnType<typeof vi.fn>;
    getCurrent?: ReturnType<typeof vi.fn>;
}

function stubChrome({
    tabs = [],
    query = vi.fn().mockResolvedValue(tabs),
    getCurrent = vi.fn().mockResolvedValue({
        id: WINDOW_ID,
    }),
}: ChromeStubOptions) {
    const activatedListeners: ActivatedListener[] = [];
    const updatedListeners: UpdatedListener[] = [];
    vi.stubGlobal('chrome', {
        tabs: {
            query,
            onActivated: {
                addListener: (listener: ActivatedListener) => activatedListeners.push(listener),
            },
            onUpdated: {
                addListener: (listener: UpdatedListener) => updatedListeners.push(listener),
            },
        },
        windows: {
            getCurrent,
            WINDOW_ID_CURRENT,
        },
    });

    return {
        query,
        activate: (windowId: number) => activatedListeners.forEach(listener => listener({
            tabId: 0,
            windowId,
        })),
        update: (
            tabId: number,
            changeInfo: chrome.tabs.OnUpdatedInfo,
            tab: Partial<chrome.tabs.Tab>,
        ) => {
            updatedListeners.forEach(listener => listener(
                /* tabId: */ tabId,
                /* changeInfo: */ changeInfo,
                /* tab: */ tab as chrome.tabs.Tab,
            ));
        },
    };
}

function aListener(): InspectedTabListener & {
    onChanged: ReturnType<typeof vi.fn>;
    onUpdated: ReturnType<typeof vi.fn>;
} {
    return {
        onChanged: vi.fn(),
        onUpdated: vi.fn(),
    };
}

describe('InspectedTabTracker', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('startAsync_WhenATabIsActive_ShouldReportItInTheCurrentWindow', async () => {
        // Arrange
        const { query } = stubChrome({
            tabs: [
                {
                    id: 7,
                    url: 'https://shop.example.com/cart',
                    title: 'Cart',
                },
            ],
        });
        const listener = aListener();

        // Act
        await new InspectedTabTracker(createLogger()).startAsync(listener);

        // Assert
        expect(query).toHaveBeenCalledWith({
            active: true,
            windowId: WINDOW_ID,
        });
        expect(listener.onChanged).toHaveBeenCalledWith({
            tabId: 7,
            url: 'https://shop.example.com/cart',
            title: 'Cart',
        });
    });

    test('startAsync_WhenTheTabIsStillLoading_ShouldUseThePendingUrl', async () => {
        // Arrange
        stubChrome({
            tabs: [
                {
                    id: 7,
                    url: '',
                    pendingUrl: 'https://shop.example.com/login',
                },
            ],
        });
        const listener = aListener();

        // Act
        await new InspectedTabTracker(createLogger()).startAsync(listener);

        // Assert
        expect(listener.onChanged).toHaveBeenCalledWith({
            tabId: 7,
            url: 'https://shop.example.com/login',
            title: '',
        });
    });

    test('startAsync_WhenNoTabIsActive_ShouldReportNone', async () => {
        // Arrange
        stubChrome({
            tabs: [],
        });
        const listener = aListener();

        // Act
        await new InspectedTabTracker(createLogger()).startAsync(listener);

        // Assert
        expect(listener.onChanged).toHaveBeenCalledWith(null);
    });

    test('startAsync_WhenTheActiveTabHasNoId_ShouldReportNone', async () => {
        // Arrange
        stubChrome({
            tabs: [
                {
                    url: 'devtools://devtools',
                },
            ],
        });
        const listener = aListener();

        // Act
        await new InspectedTabTracker(createLogger()).startAsync(listener);

        // Assert
        expect(listener.onChanged).toHaveBeenCalledWith(null);
    });

    test('startAsync_WhenTheWindowCannotBeRead_ShouldLogAndQueryTheCurrentWindow', async () => {
        // Arrange
        const { query } = stubChrome({
            tabs: [
                {
                    id: 7,
                },
            ],
            getCurrent: vi.fn().mockRejectedValue(new Error('No window')),
        });
        const logger = createLogger();

        // Act
        await new InspectedTabTracker(logger).startAsync(aListener());

        // Assert
        expect(logger.error).toHaveBeenCalledWith('Reading the panel window failed.', 'No window');
        expect(query).toHaveBeenCalledWith({
            active: true,
            windowId: WINDOW_ID_CURRENT,
        });
    });

    test('startAsync_WhenTheActiveTabCannotBeRead_ShouldLogAndReportNothing', async () => {
        // Arrange
        stubChrome({
            query: vi.fn().mockRejectedValue(new Error('Tabs unavailable')),
        });
        const logger = createLogger();
        const listener = aListener();

        // Act
        await new InspectedTabTracker(logger).startAsync(listener);

        // Assert
        expect(logger.error).toHaveBeenCalledWith('Reading the active tab failed.', 'Tabs unavailable');
        expect(listener.onChanged).not.toHaveBeenCalled();
    });

    test('onActivated_WhenAnotherTabIsActivatedInThePanelWindow_ShouldReportIt', async () => {
        // Arrange
        const query = vi.fn()
            .mockResolvedValueOnce([
                {
                    id: 7,
                },
            ])
            .mockResolvedValueOnce([
                {
                    id: 8,
                    url: 'https://docs.example.com',
                    title: 'Docs',
                },
            ]);
        const chromeStub = stubChrome({
            query,
        });
        const listener = aListener();
        await new InspectedTabTracker(createLogger()).startAsync(listener);

        // Act
        chromeStub.activate(WINDOW_ID);
        await nextTaskAsync();

        // Assert
        expect(listener.onChanged).toHaveBeenLastCalledWith({
            tabId: 8,
            url: 'https://docs.example.com',
            title: 'Docs',
        });
    });

    test('onActivated_WhenTheSameTabStaysActive_ShouldNotReportAgain', async () => {
        // Arrange
        const chromeStub = stubChrome({
            tabs: [
                {
                    id: 7,
                },
            ],
        });
        const listener = aListener();
        await new InspectedTabTracker(createLogger()).startAsync(listener);

        // Act
        chromeStub.activate(WINDOW_ID);
        await nextTaskAsync();

        // Assert
        expect(listener.onChanged).toHaveBeenCalledOnce();
    });

    test('onActivated_WhenAnotherWindowChangesTab_ShouldIgnoreIt', async () => {
        // Arrange
        const chromeStub = stubChrome({
            tabs: [
                {
                    id: 7,
                },
            ],
        });
        await new InspectedTabTracker(createLogger()).startAsync(aListener());

        // Act
        chromeStub.activate(OTHER_WINDOW_ID);
        await nextTaskAsync();

        // Assert
        expect(chromeStub.query).toHaveBeenCalledOnce();
    });

    test('onUpdated_WhenTheInspectedTabNavigates_ShouldReportTheUpdate', async () => {
        // Arrange
        const chromeStub = stubChrome({
            tabs: [
                {
                    id: 7,
                },
            ],
        });
        const listener = aListener();
        await new InspectedTabTracker(createLogger()).startAsync(listener);

        // Act
        chromeStub.update(
            /* tabId: */ 7,
            /* changeInfo: */ {
                url: 'https://shop.example.com/checkout',
            },
            /* tab: */ {
                id: 7,
                url: 'https://shop.example.com/checkout',
                title: 'Checkout',
            },
        );

        // Assert
        expect(listener.onUpdated).toHaveBeenCalledWith({
            tabId: 7,
            url: 'https://shop.example.com/checkout',
            title: 'Checkout',
        });
    });

    test('onUpdated_WhenOnlyTheTitleChanges_ShouldReportTheUpdate', async () => {
        // Arrange
        const chromeStub = stubChrome({
            tabs: [
                {
                    id: 7,
                },
            ],
        });
        const listener = aListener();
        await new InspectedTabTracker(createLogger()).startAsync(listener);

        // Act
        chromeStub.update(
            /* tabId: */ 7,
            /* changeInfo: */ {
                title: 'Cart (2)',
            },
            /* tab: */ {
                id: 7,
                title: 'Cart (2)',
            },
        );

        // Assert
        expect(listener.onUpdated).toHaveBeenCalledOnce();
    });

    test('onUpdated_WhenAnotherTabChanges_ShouldIgnoreIt', async () => {
        // Arrange
        const chromeStub = stubChrome({
            tabs: [
                {
                    id: 7,
                },
            ],
        });
        const listener = aListener();
        await new InspectedTabTracker(createLogger()).startAsync(listener);

        // Act
        chromeStub.update(
            /* tabId: */ 8,
            /* changeInfo: */ {
                url: 'https://other.example.com',
            },
            /* tab: */ {
                id: 8,
            },
        );

        // Assert
        expect(listener.onUpdated).not.toHaveBeenCalled();
    });

    test('onUpdated_WhenNeitherUrlNorTitleChanges_ShouldIgnoreIt', async () => {
        // Arrange
        const chromeStub = stubChrome({
            tabs: [
                {
                    id: 7,
                },
            ],
        });
        const listener = aListener();
        await new InspectedTabTracker(createLogger()).startAsync(listener);

        // Act
        chromeStub.update(
            /* tabId: */ 7,
            /* changeInfo: */ {
                status: 'complete',
            },
            /* tab: */ {
                id: 7,
            },
        );

        // Assert
        expect(listener.onUpdated).not.toHaveBeenCalled();
    });
});
