import { describe, expect, test, vi } from 'vitest';
import type { WorkerEvent } from '../../../Contracts/Messaging/WorkerEvent';
import { WORKER_EVENT_TYPE } from '../../../Contracts/Messaging/WorkerEventType';
import { WorkerEventRouter } from './WorkerEventRouter';

const CLEARED: WorkerEvent = Object.freeze({
    type: WORKER_EVENT_TYPE.TimelineCleared,
    tabId: 7,
});

describe('WorkerEventRouter', () => {
    test('route_WhenAHandlerIsRegisteredForTheType_ShouldCallIt', () => {
        // Arrange
        const onCleared = vi.fn();
        const onRemoved = vi.fn();
        const router = new WorkerEventRouter()
            .on(WORKER_EVENT_TYPE.TimelineCleared, onCleared)
            .on(WORKER_EVENT_TYPE.EntryRemoved, onRemoved);

        // Act
        router.route(CLEARED);

        // Assert
        expect(onCleared).toHaveBeenCalledWith(CLEARED);
        expect(onRemoved).not.toHaveBeenCalled();
    });

    test('route_WhenNoHandlerIsRegisteredForTheType_ShouldIgnoreTheEvent', () => {
        // Arrange
        const router = new WorkerEventRouter();

        // Act
        const route = () => router.route(CLEARED);

        // Assert
        expect(route).not.toThrow();
    });

    test('on_WhenRegisteredTwiceForOneType_ShouldKeepTheLatestHandler', () => {
        // Arrange
        const first = vi.fn();
        const second = vi.fn();
        const router = new WorkerEventRouter()
            .on(WORKER_EVENT_TYPE.TimelineCleared, first)
            .on(WORKER_EVENT_TYPE.TimelineCleared, second);

        // Act
        router.route(CLEARED);

        // Assert
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledOnce();
    });
});
