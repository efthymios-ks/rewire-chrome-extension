import { describe, expect, test } from 'vitest';
import { DefaultFrameRegistry } from './DefaultFrameRegistry';

describe('DefaultFrameRegistry', () => {
    test.each([
        [
            'top-frame',
            true,
        ],
        [
            'iframe-1',
            false,
        ],
    ])('frameOf_WhenTheFrameIs(%s)_ShouldSayWhetherItIsTheTopFrame', (frameId, expected) => {
        // Arrange
        const registry = new DefaultFrameRegistry();
        registry.setTop(1, 'top-frame');

        // Act
        const frame = registry.frameOf({
            tabId: 1,
            frameId,
            documentUrl: 'https://widget.example.com/embed',
        });

        // Assert
        expect(frame).toEqual({
            id: frameId,
            url: 'https://widget.example.com/embed',
            isTop: expected,
        });
    });

    test('frameOf_WhenTheRequestHasNoFrame_ShouldReturnNull', () => {
        // Arrange
        const registry = new DefaultFrameRegistry();

        // Act
        const frame = registry.frameOf({
            tabId: 1,
            frameId: undefined,
            documentUrl: 'https://app.example.com/',
        });

        // Assert
        expect(frame).toBeNull();
    });

    test('frameOf_WhenTheTopFrameIsUnknown_ShouldTreatEveryFrameAsTop', () => {
        // Arrange
        const registry = new DefaultFrameRegistry();
        registry.setTop(1, 'top-frame');
        registry.forget(1);

        // Act
        const frame = registry.frameOf({
            tabId: 1,
            frameId: 'iframe-1',
            documentUrl: 'https://widget.example.com/embed',
        });

        // Assert
        expect(frame?.isTop).toBe(true);
    });
});
