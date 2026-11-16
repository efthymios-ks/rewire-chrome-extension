import { describe, expect, test, vi } from 'vitest';
import { DefaultPanelConnectionHub } from './DefaultPanelConnectionHub';
import type { WorkerEvent } from '../../../Contracts/Messaging/WorkerEvent';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import { createLogger } from '../../../TestData';

const TAB_ID = 7;
const OTHER_TAB_ID = 8;
const TIMELINE_CLEARED: WorkerEvent = {
    type: WORKER_EVENT_TYPE.TimelineCleared,
    tabId: TAB_ID,
};

function aPort() {
    const postMessage = vi.fn();
    const port = {
        postMessage,
    } as unknown as chrome.runtime.Port;

    return {
        port,
        postMessage,
    };
}

describe('DefaultPanelConnectionHub', () => {
    test('add_WhenAPanelConnects_ShouldTrackItWithoutATab', () => {
        // Arrange
        const hub = new DefaultPanelConnectionHub(createLogger());
        const { port } = aPort();

        // Act
        const connection = hub.add(port);

        // Assert
        expect(connection.id).not.toBe('');
        expect(connection.port).toBe(port);
        expect(connection.tabId).toBeNull();
        expect(hub.hasConnections()).toBe(true);
    });

    test('add_WhenTwoPanelsConnect_ShouldGiveThemDifferentIds', () => {
        // Arrange
        const hub = new DefaultPanelConnectionHub(createLogger());

        // Act
        const first = hub.add(aPort().port);
        const second = hub.add(aPort().port);

        // Assert
        expect(first.id).not.toBe(second.id);
    });

    test('remove_WhenTheConnectionExists_ShouldReturnAndForgetIt', () => {
        // Arrange
        const hub = new DefaultPanelConnectionHub(createLogger());
        const connection = hub.add(aPort().port);

        // Act
        const removed = hub.remove(connection.id);

        // Assert
        expect(removed).toBe(connection);
        expect(hub.hasConnections()).toBe(false);
    });

    test('remove_WhenTheConnectionIsUnknown_ShouldReturnUndefined', () => {
        // Arrange
        const hub = new DefaultPanelConnectionHub(createLogger());

        // Act
        const removed = hub.remove('connection-1');

        // Assert
        expect(removed).toBeUndefined();
    });

    test('assignTab_WhenThePanelSwitchesTabs_ShouldReturnThePreviousTab', () => {
        // Arrange
        const hub = new DefaultPanelConnectionHub(createLogger());
        const connection = hub.add(aPort().port);

        // Act
        const firstPrevious = hub.assignTab(connection.id, TAB_ID);
        const secondPrevious = hub.assignTab(connection.id, OTHER_TAB_ID);

        // Assert
        expect(firstPrevious).toBeNull();
        expect(secondPrevious).toBe(TAB_ID);
        expect(hub.isTabInspected(TAB_ID)).toBe(false);
        expect(hub.isTabInspected(OTHER_TAB_ID)).toBe(true);
    });

    test('assignTab_WhenTheConnectionIsUnknown_ShouldReturnNull', () => {
        // Arrange
        const hub = new DefaultPanelConnectionHub(createLogger());

        // Act
        const previous = hub.assignTab('connection-1', TAB_ID);

        // Assert
        expect(previous).toBeNull();
        expect(hub.isTabInspected(TAB_ID)).toBe(false);
    });

    test('send_WhenThePortIsOpen_ShouldPostTheEvent', () => {
        // Arrange
        const hub = new DefaultPanelConnectionHub(createLogger());
        const { port, postMessage } = aPort();
        const connection = hub.add(port);

        // Act
        hub.send(connection, TIMELINE_CLEARED);

        // Assert
        expect(postMessage).toHaveBeenCalledWith(TIMELINE_CLEARED);
    });

    test('send_WhenThePortIsGone_ShouldLogAndDropTheConnection', () => {
        // Arrange
        const logger = createLogger();
        const hub = new DefaultPanelConnectionHub(logger);
        const { port, postMessage } = aPort();
        postMessage.mockImplementation(() => {
            throw new Error('Attempting to use a disconnected port object');
        });
        const connection = hub.add(port);

        // Act
        hub.send(connection, TIMELINE_CLEARED);

        // Assert
        expect(logger.warn).toHaveBeenCalledWith(
            `Panel ${connection.id} is gone: Attempting to use a disconnected port object`,
        );
        expect(hub.hasConnections()).toBe(false);
    });

    test('publishToTab_WhenPanelsInspectDifferentTabs_ShouldReachOnlyThatTabsPanels', () => {
        // Arrange
        const hub = new DefaultPanelConnectionHub(createLogger());
        const first = aPort();
        const second = aPort();
        const other = aPort();
        hub.assignTab(hub.add(first.port).id, TAB_ID);
        hub.assignTab(hub.add(second.port).id, TAB_ID);
        hub.assignTab(hub.add(other.port).id, OTHER_TAB_ID);

        // Act
        hub.publishToTab(TAB_ID, TIMELINE_CLEARED);

        // Assert
        expect(first.postMessage).toHaveBeenCalledWith(TIMELINE_CLEARED);
        expect(second.postMessage).toHaveBeenCalledWith(TIMELINE_CLEARED);
        expect(other.postMessage).not.toHaveBeenCalled();
    });
});
