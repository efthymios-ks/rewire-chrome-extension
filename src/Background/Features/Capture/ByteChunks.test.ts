import { describe, expect, test } from 'vitest';
import { ByteChunks } from './ByteChunks';

describe('ByteChunks', () => {
    test('join_WhenGivenSeveralChunks_ShouldConcatenateThemInOrder', () => {
        // Arrange
        const chunks = [
            new Uint8Array([
                1,
                2,
            ]),
            new Uint8Array([]),
            new Uint8Array([3]),
        ];

        // Act
        const joined = ByteChunks.join(chunks);

        // Assert
        expect(joined).toEqual(new Uint8Array([
            1,
            2,
            3,
        ]));
    });

    test('join_WhenGivenNoChunks_ShouldReturnNoBytes', () => {
        // Arrange
        const chunks: Uint8Array[] = [];

        // Act
        const joined = ByteChunks.join(chunks);

        // Assert
        expect(joined).toHaveLength(0);
    });
});
