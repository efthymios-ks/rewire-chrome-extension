import { describe, expect, test } from 'vitest';
import { BinaryBodyView } from './BinaryBodyView';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { buttonNamed, click } from '../../PanelTestData';

const BYTES_PER_LINE = 16;

function bytesOf(length: number): Uint8Array {
    return Uint8Array.from({ length }, (_, index) => index % 256);
}

function dumpOf(root: HTMLElement): string {
    return root.querySelector('[aria-label="Hex dump"]')?.textContent ?? '';
}

describe('BinaryBodyView', () => {
    test('build_WhenGivenANote_ShouldShowItAboveTheHexDump', () => {
        // Arrange
        const base64 = Base64Text.fromBytes(new Uint8Array([
            0x1f,
            0x8b,
        ]));

        // Act
        const root = BinaryBodyView.build({ base64, note: 'Binary body · 2 bytes.' });

        // Assert
        expect(root.querySelector('.help-text')?.textContent).toBe('Binary body · 2 bytes.');
        expect(dumpOf(root)).toBe(`00000000  1f 8b${' '.repeat(45)}|..|`);
    });

    test('build_WhenTheBodyIsShort_ShouldDumpEveryByteWithoutAShowAllButton', () => {
        // Arrange
        const base64 = Base64Text.fromBytes(bytesOf(4096));

        // Act
        const root = BinaryBodyView.build({ base64, note: null });

        // Assert
        expect(dumpOf(root).split('\n')).toHaveLength(4096 / BYTES_PER_LINE);
        expect(root.querySelector('button')).toBeNull();
    });

    test('build_WhenTheBodyIsLong_ShouldPreviewTheFirstBytesAndSaySo', () => {
        // Arrange
        const base64 = Base64Text.fromBytes(bytesOf(5000));

        // Act
        const root = BinaryBodyView.build({ base64, note: null });

        // Assert
        expect(dumpOf(root).split('\n')).toHaveLength(4096 / BYTES_PER_LINE);
        expect(root.textContent).toContain('Showing the first 4,096 of 5,000 bytes.');
    });

    test('showAll_WhenClicked_ShouldDumpEveryByte', () => {
        // Arrange
        const base64 = Base64Text.fromBytes(bytesOf(5000));
        const root = BinaryBodyView.build({ base64, note: null });

        // Act
        click(buttonNamed(root, 'Show all'));

        // Assert
        const lines = dumpOf(root).split('\n');
        expect(lines).toHaveLength(Math.ceil(5000 / BYTES_PER_LINE));
        expect(lines.at(-1)?.startsWith('00001380  80 81 82 83 84 85 86 87')).toBe(true);
        expect(root.textContent).not.toContain('Showing the first');
        expect(root.querySelector('button')).toBeNull();
    });
});
