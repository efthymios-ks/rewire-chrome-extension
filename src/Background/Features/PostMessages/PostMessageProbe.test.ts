import { describe, expect, test, vi } from 'vitest';
import { POST_MESSAGE_BINDING_NAME } from './PostMessageBindingName';
import { PostMessageProbe } from './PostMessageProbe';

type ProbeWindow = EventTarget & Record<string, unknown>;

const PAGE_URL = 'https://app.example.com/checkout';

function aWindow(): ProbeWindow {
    const window = new EventTarget() as ProbeWindow;
    window['top'] = window;
    window[POST_MESSAGE_BINDING_NAME] = vi.fn();

    return window;
}

function bindingOf(window: ProbeWindow): ReturnType<typeof vi.fn> {
    return window[POST_MESSAGE_BINDING_NAME] as ReturnType<typeof vi.fn>;
}

function runIn(window: ProbeWindow, source: string): void {
    const script = new Function(
        /* ...args: */ 'globalThis',
        /* ...args: */ 'location',
        /* ...args: */ source,
    ) as (
        globalObject: ProbeWindow,
        location: { href: string },
    ) => void;
    script(window, {
        href: PAGE_URL,
    });
}

function postTo(window: ProbeWindow, data: string): void {
    window.dispatchEvent(new MessageEvent('message', {
        data,
        origin: 'https://pay.example.com',
    }));
}

describe('PostMessageProbe', () => {
    test('source_WhenRead_ShouldListenForMessagesThroughTheBinding', () => {
        // Arrange
        const source = PostMessageProbe.source;

        // Act
        const isUsingBinding = source.includes(JSON.stringify(POST_MESSAGE_BINDING_NAME));

        // Assert
        expect(isUsingBinding).toBe(true);
        expect(source).toContain('addEventListener("message"');
    });

    test('parse_WhenTheReportIsComplete_ShouldReturnIt', () => {
        // Arrange
        const payload = JSON.stringify({
            origin: 'https://pay.example.com',
            href: 'https://app.example.com/',
            isTop: true,
            isFromTop: false,
            isFromSelf: false,
            data: '{"status":"paid"}',
        });

        // Act
        const report = PostMessageProbe.parse(payload);

        // Assert
        expect(report?.origin).toBe('https://pay.example.com');
    });

    test.each([
        'not json',
        'null',
        '{"origin":1}',
    ])('parse_WhenThePayloadIs(%s)_ShouldReturnNull', payload => {
        // Arrange
        const text = payload;

        // Act
        const report = PostMessageProbe.parse(text);

        // Assert
        expect(report).toBeNull();
    });

    test('source_WhenRunTwice_ShouldReportEachMessageOnce', () => {
        // Arrange
        const window = aWindow();
        runIn(window, PostMessageProbe.source);
        runIn(window, PostMessageProbe.source);

        // Act
        postTo(window, 'hello');

        // Assert
        expect(bindingOf(window)).toHaveBeenCalledOnce();
    });

    test('removalSource_WhenRunAfterTheProbe_ShouldRemoveTheListener', () => {
        // Arrange
        const window = aWindow();
        runIn(window, PostMessageProbe.source);

        // Act
        runIn(window, PostMessageProbe.removalSource);
        postTo(window, 'hello');

        // Assert
        expect(bindingOf(window)).not.toHaveBeenCalled();
    });

    test('source_WhenRunAgainWithANewBinding_ShouldReportThroughTheNewBinding', () => {
        // Arrange
        const window = aWindow();
        const firstBinding = bindingOf(window);
        runIn(window, PostMessageProbe.source);
        runIn(window, PostMessageProbe.removalSource);
        window[POST_MESSAGE_BINDING_NAME] = vi.fn();
        runIn(window, PostMessageProbe.source);

        // Act
        postTo(window, 'hello');

        // Assert
        expect(firstBinding).not.toHaveBeenCalled();
        expect(bindingOf(window)).toHaveBeenCalledOnce();
        expect(PostMessageProbe.parse(String(bindingOf(window).mock.calls[0]?.[0]))).toEqual({
            origin: 'https://pay.example.com',
            href: PAGE_URL,
            isTop: true,
            isFromTop: false,
            isFromSelf: false,
            data: 'hello',
        });
    });

    test('removalSource_WhenNoProbeIsInstalled_ShouldDoNothing', () => {
        // Arrange
        const window = aWindow();

        // Act
        const remove = () => runIn(window, PostMessageProbe.removalSource);

        // Assert
        expect(remove).not.toThrow();
    });
});
