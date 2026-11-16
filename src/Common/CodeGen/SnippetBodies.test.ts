import { describe, expect, test } from 'vitest';
import { SnippetBodies } from './SnippetBodies';
import { SNIPPET_BODY_KIND } from './SnippetBodyKind';

describe('SnippetBodies', () => {
    test.each([
        [
            'empty text',
            SnippetBodies.text(''),
        ],
        [
            'no multipart parts',
            SnippetBodies.multipart([]),
        ],
    ])('hasBody_WhenTheBodyIs(%s)_ShouldReturnFalse', (_case, body) => {
        // Arrange
        const value = body;

        // Act
        const hasBody = SnippetBodies.hasBody(value);

        // Assert
        expect(hasBody).toBe(false);
        expect(value.kind).toBe(SNIPPET_BODY_KIND.None);
    });

    test('filePart_WhenBuilt_ShouldHoldTheFileAndNoValue', () => {
        // Arrange
        const name = 'avatar';

        // Act
        const part = SnippetBodies.filePart({ name, fileName: 'photo.png', contentType: 'image/png' });

        // Assert
        expect(part).toEqual({
            name,
            value: '',
            fileName: 'photo.png',
            contentType: 'image/png',
        });
    });
});
