import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { buildElement } from '../../Core/Dom/buildElement';
import { FormControls } from '../../Core/Dom/FormControls';
import { HexDump } from './HexDump';

const PREVIEW_BYTES = 4096;
const NUMBER_LOCALE = 'en-US';

export interface BuildOptions {
    base64: string;
    note: string | null;
}

function previewOf(bytes: Uint8Array, dump: HTMLPreElement): HTMLElement | null {
    if (bytes.length <= PREVIEW_BYTES) {
        return null;
    }

    const preview = buildElement('div', {
        className: 'body-tools',
    });
    preview.append(
        /* ...nodes: */ buildElement('span', {
            className: 'help-text',
            text: `Showing the first ${PREVIEW_BYTES.toLocaleString(NUMBER_LOCALE)} `
                + `of ${bytes.length.toLocaleString(NUMBER_LOCALE)} bytes.`,
        }),
        /* ...nodes: */ FormControls.button({
            text: 'Show all',
            variant: BUTTON_VARIANTS.Ghost,
            onClick: () => {
                dump.textContent = HexDump.of(bytes);
                preview.remove();
            },
        }),
    );

    return preview;
}

export const BinaryBodyView = {
    build({ base64, note }: BuildOptions): HTMLElement {
        const bytes = Base64Text.toBytes(base64);
        const dump = buildElement('pre', {
            className: 'code-block hex-dump',
            text: HexDump.of(bytes.subarray(0, PREVIEW_BYTES)),
            attributes: {
                'aria-label': 'Hex dump',
            },
        });

        return buildElement('div', {
            className: 'body-view',
            children: [
                note == null
                    ? null
                    : buildElement('p', {
                        className: 'help-text',
                        text: note,
                    }),
                previewOf(bytes, dump),
                dump,
            ],
        });
    },
};
