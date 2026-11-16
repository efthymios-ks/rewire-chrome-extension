import { buildElement } from '../../Core/Dom/buildElement';

const SPLIT_RATIO_STORAGE_KEY = 'rewire.splitRatio';
const COLLAPSED_STORAGE_KEY = 'rewire.inspectorCollapsed';
const COLLAPSED_VALUE = 'true';
const DEFAULT_SPLIT_RATIO = 0.45;
const MIN_SPLIT_RATIO = 0.15;
const MAX_SPLIT_RATIO = 0.85;
const KEYBOARD_STEP = 0.05;
const WIDE_LAYOUT_MIN_WIDTH = 720;
const PERCENT_FACTOR = 100;

const ORIENTATIONS = Object.freeze({
    Vertical: 'vertical',
    Horizontal: 'horizontal',
} as const);

type Orientation = typeof ORIENTATIONS[keyof typeof ORIENTATIONS];

interface ToggleIcon {
    open: string;
    collapsed: string;
}

const TOGGLE_ICONS: Record<Orientation, ToggleIcon> = {
    [ORIENTATIONS.Vertical]: {
        open: '\u25BE',
        collapsed: '\u25B4',
    },
    [ORIENTATIONS.Horizontal]: {
        open: '\u25B8',
        collapsed: '\u25C2',
    },
};

const KEYBOARD_STEPS: Record<string, number> = Object.freeze({
    ArrowUp: -KEYBOARD_STEP,
    ArrowLeft: -KEYBOARD_STEP,
    ArrowDown: KEYBOARD_STEP,
    ArrowRight: KEYBOARD_STEP,
});

function clampRatio(ratio: number): number {
    return Math.min(
        /* values: */ MAX_SPLIT_RATIO,
        /* values: */ Math.max(MIN_SPLIT_RATIO, ratio),
    );
}

function loadRatio(): number {
    try {
        const stored = Number(localStorage.getItem(SPLIT_RATIO_STORAGE_KEY));

        return Number.isFinite(stored) && stored > 0 ? clampRatio(stored) : DEFAULT_SPLIT_RATIO;
    } catch {
        return DEFAULT_SPLIT_RATIO;
    }
}

function loadCollapsed(): boolean {
    try {
        return localStorage.getItem(COLLAPSED_STORAGE_KEY) === COLLAPSED_VALUE;
    } catch {
        return false;
    }
}

function saveCollapsed(isCollapsed: boolean): void {
    try {
        localStorage.setItem(
            /* key: */ COLLAPSED_STORAGE_KEY,
            /* value: */ String(isCollapsed),
        );
    } catch {
        return;
    }
}

function saveRatio(ratio: number): void {
    try {
        localStorage.setItem(
            /* key: */ SPLIT_RATIO_STORAGE_KEY,
            /* value: */ String(ratio),
        );
    } catch {
        return;
    }
}

export class SplitPane {
    readonly root: HTMLDivElement;

    private readonly _handle: HTMLDivElement;
    private readonly _toggle: HTMLButtonElement;
    private _ratio = DEFAULT_SPLIT_RATIO;
    private _isCollapsed = false;

    constructor(first: HTMLElement, second: HTMLElement) {
        this._toggle = buildElement('button', {
            className: 'split-toggle',
            attributes: {
                type: 'button',
            },
            listeners: {
                pointerdown: event => event.stopPropagation(),
                click: () => this.setCollapsed(!this._isCollapsed),
            },
        });
        this._handle = buildElement('div', {
            className: 'split-handle',
            title: 'Drag to resize',
            attributes: {
                role: 'separator',
                tabindex: '0',
            },
            children: [this._toggle],
        });
        this.root = buildElement('div', {
            className: 'split-pane',
            children: [
                buildElement('div', {
                    className: 'split-first',
                    children: [first],
                }),
                this._handle,
                buildElement('div', {
                    className: 'split-second',
                    children: [second],
                }),
            ],
        });

        this.applyRatio(loadRatio());
        this.setCollapsed(loadCollapsed());
        this.listenForDrag();
        this.listenForKeys();
        new ResizeObserver(() => this.updateOrientation()).observe(this.root);
    }

    expand(): void {
        this.setCollapsed(false);
    }

    private listenForDrag(): void {
        this._handle.addEventListener(
            /* type: */ 'pointerdown',
            /* listener: */ downEvent => {
                this._handle.setPointerCapture(downEvent.pointerId);
                this.setCollapsed(false);

                const onMove = (moveEvent: PointerEvent): void => {
                    const bounds = this.root.getBoundingClientRect();
                    const ratio = this.isHorizontal()
                        ? (moveEvent.clientX - bounds.left) / bounds.width
                        : (moveEvent.clientY - bounds.top) / bounds.height;
                    this.applyRatio(ratio);
                };
                const onUp = (): void => {
                    this._handle.removeEventListener('pointermove', onMove);
                    this._handle.removeEventListener('pointerup', onUp);
                    saveRatio(this._ratio);
                };

                this._handle.addEventListener('pointermove', onMove);
                this._handle.addEventListener('pointerup', onUp);
            },
        );
    }

    private listenForKeys(): void {
        this._handle.addEventListener(
            /* type: */ 'keydown',
            /* listener: */ event => {
                const step = KEYBOARD_STEPS[event.key];
                if (step == null) {
                    return;
                }

                event.preventDefault();
                this.setCollapsed(false);
                this.applyRatio(this._ratio + step);
                saveRatio(this._ratio);
            },
        );
    }

    private applyRatio(ratio: number): void {
        this._ratio = clampRatio(ratio);
        this.root.style.setProperty('--split-first-size', `${this._ratio * PERCENT_FACTOR}%`);
    }

    private setCollapsed(isCollapsed: boolean): void {
        if (this._isCollapsed !== isCollapsed) {
            saveCollapsed(isCollapsed);
        }

        this._isCollapsed = isCollapsed;
        this.root.dataset['collapsed'] = String(isCollapsed);
        this.updateToggle();
    }

    private updateToggle(): void {
        const orientation = this.isHorizontal() ? ORIENTATIONS.Horizontal : ORIENTATIONS.Vertical;
        const icons = TOGGLE_ICONS[orientation];
        const label = this._isCollapsed ? 'Show the inspector' : 'Hide the inspector';
        this._toggle.textContent = this._isCollapsed ? icons.collapsed : icons.open;
        this._toggle.title = label;
        this._toggle.setAttribute('aria-label', label);
        this._toggle.setAttribute(
            /* qualifiedName: */ 'aria-expanded',
            /* value: */ String(!this._isCollapsed),
        );
    }

    private isHorizontal(): boolean {
        return this.root.dataset['orientation'] === ORIENTATIONS.Horizontal;
    }

    private updateOrientation(): void {
        const orientation = this.root.clientWidth >= WIDE_LAYOUT_MIN_WIDTH
            ? ORIENTATIONS.Horizontal
            : ORIENTATIONS.Vertical;
        this.root.dataset['orientation'] = orientation;
        const handleOrientation = orientation === ORIENTATIONS.Horizontal
            ? ORIENTATIONS.Vertical
            : ORIENTATIONS.Horizontal;
        this._handle.setAttribute('aria-orientation', handleOrientation);
        this.updateToggle();
    }
}
