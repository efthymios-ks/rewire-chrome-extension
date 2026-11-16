import { describe, expect, test } from 'vitest';
import { DefaultCaptureFilter } from './DefaultCaptureFilter';

describe('DefaultCaptureFilter', () => {
    test.each([
        [
            'Fetch',
            true,
        ],
        [
            'XHR',
            true,
        ],
        [
            'Ping',
            true,
        ],
        [
            'Document',
            true,
        ],
        [
            'Image',
            false,
        ],
        [
            'Stylesheet',
            false,
        ],
        [
            'Script',
            false,
        ],
        [
            undefined,
            false,
        ],
        [
            'constructor',
            false,
        ],
    ])('shouldCapture_WhenResourceTypeIs(%s)_ShouldKeepApiCallsBeaconsAndPages', (resourceType, expected) => {
        // Arrange
        const filter = new DefaultCaptureFilter();

        // Act
        const shouldCapture = filter.shouldCapture(resourceType);

        // Assert
        expect(shouldCapture).toBe(expected);
    });
});
