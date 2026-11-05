import { buildElement } from "../../Core/Dom/ElementBuilder";

const SplitRatioStorageKey = "rewire.splitRatio";
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
    private _ratio = DefaultSplitRatio;

    constructor(first: HTMLElement, second: HTMLElement) {
        this._handle = buildElement("div", {
            className: "split-handle",
            title: "Drag to resize",
            attributes: {
                role: "separator",
                tabindex: "0",
            },
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
        this.listenForDrag();
        this.listenForKeys();
        new ResizeObserver(() => this.updateOrientation()).observe(this.root);
    }

    private listenForDrag(): void {
        this._handle.addEventListener("pointerdown", downEvent => {
            this._handle.setPointerCapture(downEvent.pointerId);

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
            this.applyRatio(this._ratio + step);
            saveRatio(this._ratio);
        });
    }

    private applyRatio(ratio: number): void {
        this._ratio = clampRatio(ratio);
        this.root.style.setProperty("--split-first-size", `${this._ratio * PercentFactor}%`);
    }

    private isHorizontal(): boolean {
        return this.root.dataset["orientation"] === Orientations.Horizontal;
    }

    private updateOrientation(): void {
        const orientation = this.root.clientWidth >= WideLayoutMinWidth ? Orientations.Horizontal : Orientations.Vertical;
        this.root.dataset["orientation"] = orientation;
        this._handle.setAttribute("aria-orientation", orientation === Orientations.Horizontal ? Orientations.Vertical : Orientations.Horizontal);
    }
}
