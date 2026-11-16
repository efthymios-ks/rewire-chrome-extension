import { describe, expect, test, vi } from 'vitest';
import { DefaultLiveStore } from '../Live/DefaultLiveStore';
import { PostMessageBindingHandler } from './PostMessageBindingHandler';
import { POST_MESSAGE_BINDING_NAME } from './PostMessageBindingName';
import type { PostMessageReport } from './PostMessageProbe';

function aReport(overrides: Partial<PostMessageReport> = {}): PostMessageReport {
    return {
        origin: 'https://pay.example.com',
        href: 'https://app.example.com/checkout',
        isTop: true,
        isFromTop: false,
        isFromSelf: false,
        data: '{"status":"paid"}',
        ...overrides,
    };
}

function setUp(isMine: boolean) {
    const store = new DefaultLiveStore();
    const sender = {
        sendAsync: vi.fn(),
        claim: vi.fn().mockReturnValue(isMine),
    };
    const handler = new PostMessageBindingHandler({
        liveStore: store,
        sender,
        now: () => new Date('2026-11-12T10:00:00.000Z'),
    });

    return {
        store,
        sender,
        handler,
    };
}

describe('PostMessageBindingHandler', () => {
    test('handleAsync_WhenAnIframeMessagesTheTopFrame_ShouldRecordFromAndTo', async () => {
        // Arrange
        const { store, handler } = setUp(false);

        // Act
        await handler.handleAsync(7, {
            name: POST_MESSAGE_BINDING_NAME,
            payload: JSON.stringify(aReport()),
            executionContextId: 1,
        });

        // Assert
        expect(store.snapshot(7).postMessages[0]).toMatchObject({
            from: 'pay.example.com',
            to: 'top',
            origin: 'https://pay.example.com',
            data: '{"status":"paid"}',
            size: 17,
            isMine: false,
        });
    });

    test('handleAsync_WhenTheTopFrameMessagesAnIframe_ShouldMarkTheSenderAsTop', async () => {
        // Arrange
        const { store, sender, handler } = setUp(true);

        // Act
        await handler.handleAsync(7, {
            name: POST_MESSAGE_BINDING_NAME,
            payload: JSON.stringify(aReport({
                href: 'https://pay.example.com/frame',
                isTop: false,
                isFromTop: true,
                origin: 'https://app.example.com',
            })),
            executionContextId: 1,
        });

        // Assert
        expect(store.snapshot(7).postMessages[0]).toMatchObject({
            from: 'top',
            to: 'pay.example.com',
            isMine: true,
        });
        expect(sender.claim).toHaveBeenCalledWith({
            tabId: 7,
            to: 'pay.example.com',
            data: '{"status":"paid"}',
        });
    });

    test('handleAsync_WhenAnotherBindingIsCalled_ShouldIgnoreIt', async () => {
        // Arrange
        const { store, handler } = setUp(false);

        // Act
        await handler.handleAsync(7, {
            name: 'somethingElse',
            payload: JSON.stringify(aReport()),
            executionContextId: 1,
        });

        // Assert
        expect(store.snapshot(7).postMessages).toEqual([]);
    });
});
