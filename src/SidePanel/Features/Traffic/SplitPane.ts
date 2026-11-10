import { buildElement } from "../../Core/Dom/ElementBuilder";

const SplitRatioStorageKey = "rewire.splitRatio";
const CollapsedStorageKey = "rewire.inspectorCollapsed";
const CollapsedValue = "true";
const DefaultSplitRatio = 0.45;
const MinSplitRatio = 0.15;
const MaxSplitRatio = 0.85;
const KeyboardStep = 0.05;
const WideLayoutMinWidth = 720;
const PercentFactor = 100;

const Orientations = {
    Vertical: "vertical",
    Horizontal: "horizontal",
} as const;

type Orientation = typeof Orientations[keyof typeof Orientations];

interface ToggleIcon {
    open: string;
    collapsed: string;
}

const ToggleIcons: Record<Orientation, ToggleIcon> = {
    [Orientations.Vertical]: {
        open: "\u25BE",
        collapsed: "\u25B4",
    },
    [Orientations.Horizontal]: {
        open: "\u25B8",
        collapsed: "\u25C2",
    },
};

const KeyboardSteps: Record<string, number> = {
    ArrowUp: -KeyboardStep,
    ArrowLeft: -KeyboardStep,
    ArrowDown: KeyboardStep,
    ArrowRight: KeyboardStep,
};

function clampRatio(ratio: number): number {
    return Math.min(MaxSplitRatio, Math.max(MinSplitRatio, ratio));
}

function loadRatio(): number {
    try {
        const stored = Number(localStorage.getItem(SplitRatioStorageKey));

        return Number.isFinite(stored) && stored > 0 ? clampRatio(stored) : DefaultSplitRatio;
    } catch {
        return DefaultSplitRatio;
    }
}

function loadCollapsed(): boolean {
    try {
        return localStorage.getItem(CollapsedStorageKey) === CollapsedValue;
    } catch {
        return false;
    }
}

function saveCollapsed(isCollapsed: boolean): void {
    try {
        localStorage.setItem(CollapsedStorageKey, String(isCollapsed));
    } catch {
        return;
    }
}

function saveRatio(ratio: number): void {
    try {
        localStorage.setItem(SplitRatioStorageKey, String(ratio));
    } catch {
        return;
    }
}

export class SplitPane {
    readonly root: HTMLDivElement;

    private readonly _handle: HTMLDivElement;
    private readonly _toggle: HTMLButtonElement;
    private _ratio = DefaultSplitRatio;
    private _isCollapsed = false;

    constructor(first: HTMLElement, second: HTMLElement) {
        this._toggle = buildElement("button", {
            className: "split-toggle",
            attributes: {
                type: "button",
            },
            listeners: {
                pointerdown: event => event.stopPropagation(),
                click: () => this.setCollapsed(!this._isCollapsed),
            },
        });
        this._handle = buildElement("div", {
            className: "split-handle",
            title: "Drag to resize",
            attributes: {
                role: "separator",
                tabindex: "0",
            },
            children: [this._toggle],
        });
        this.root = buildElement("div", {
            className: "split-pane",
            children: [
                buildElement("div", {
                    className: "split-first",
                    children: [first],
                }),
                this._handle,
                buildElement("div", {
                    className: "split-second",
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
        this._handle.addEventListener("pointerdown", downEvent => {
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
                this._handle.removeEventListener("pointermove", onMove);
                this._handle.removeEventListener("pointerup", onUp);
                saveRatio(this._ratio);
            };

            this._handle.addEventListener("pointermove", onMove);
            this._handle.addEventListener("pointerup", onUp);
        });
    }

    private listenForKeys(): void {
        this._handle.addEventListener("keydown", event => {
            const step = KeyboardSteps[event.key];
            if (step === undefined) {
                return;
            }

            event.preventDefault();
            this.setCollapsed(false);
            this.applyRatio(this._ratio + step);
            saveRatio(this._ratio);
        });
    }

    private applyRatio(ratio: number): void {
        this._ratio = clampRatio(ratio);
        this.root.style.setProperty("--split-first-size", `${this._ratio * PercentFactor}%`);
    }

    private setCollapsed(isCollapsed: boolean): void {
        if (this._isCollapsed !== isCollapsed) {
            saveCollapsed(isCollapsed);
        }

        this._isCollapsed = isCollapsed;
        this.root.dataset["collapsed"] = String(isCollapsed);
        this.updateToggle();
    }

    private updateToggle(): void {
        const orientation = this.isHorizontal() ? Orientations.Horizontal : Orientations.Vertical;
        const icons = ToggleIcons[orientation];
        const label = this._isCollapsed ? "Show the inspector" : "Hide the inspector";
        this._toggle.textContent = this._isCollapsed ? icons.collapsed : icons.open;
        this._toggle.title = label;
        this._toggle.setAttribute("aria-label", label);
        this._toggle.setAttribute("aria-expanded", String(!this._isCollapsed));
    }

    private isHorizontal(): boolean {
        return this.root.dataset["orientation"] === Orientations.Horizontal;
    }

    private updateOrientation(): void {
        const orientation = this.root.clientWidth >= WideLayoutMinWidth ? Orientations.Horizontal : Orientations.Vertical;
        this.root.dataset["orientation"] = orientation;
        this._handle.setAttribute("aria-orientation", orientation === Orientations.Horizontal ? Orientations.Vertical : Orientations.Horizontal);
        this.updateToggle();
    }
}
