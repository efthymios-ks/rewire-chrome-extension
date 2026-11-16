import { buildElement } from '../../Core/Dom/buildElement';
import { FRAME_FILTERS } from '../../Core/FrameFilters';
import type { PageFrame } from './PageFrame';

const FIXED_OPTIONS = [
    {
        value: FRAME_FILTERS.All,
        label: 'All frames',
    },
    {
        value: FRAME_FILTERS.Top,
        label: 'top',
    },
];

export class FrameSelect {
    readonly root: HTMLSelectElement;

    constructor(onChange: (value: string) => void) {
        this.root = buildElement('select', {
            className: 'input frame-select',
            attributes: {
                'aria-label': 'Frame',
            },
        });
        this.root.addEventListener('change', () => onChange(this.root.value));
    }

    update(frames: PageFrame[], value: string): void {
        const options = [
            ...FIXED_OPTIONS,
            ...frames.map(frame => ({
                value: frame.id,
                label: frame.label,
            })),
        ];
        this.root.replaceChildren(...options.map(option => buildElement('option', {
            text: option.label,
            attributes: {
                value: option.value,
            },
        })));
        this.root.value = value;
    }
}
