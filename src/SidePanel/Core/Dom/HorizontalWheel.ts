const Easing = 0.25;
const SettleDistance = 1;
const PixelsPerLine = 16;

export type FrameRequester = (step: () => void) => void;

type DeltaReader = (event: WheelEvent, element: HTMLElement) => number;

const DeltaReaders: Record<number, DeltaReader> = {
    [WheelEvent.DOM_DELTA_PIXEL]: event => event.deltaY,
    [WheelEvent.DOM_DELTA_LINE]: event => event.deltaY * PixelsPerLine,
    [WheelEvent.DOM_DELTA_PAGE]: (event, element) => event.deltaY * element.clientWidth,
};

function clamp(
    value: number,
    min: number,
    max: number
): number {
    return Math.min(max, Math.max(min, value));
}

function nextFrame(step: () => void): void {
    requestAnimationFrame(step);
}

export class HorizontalWheel {
    private readonly _element: HTMLElement;
    private readonly _requestFrame: FrameRequester;
    private _position = 0;
    private _target = 0;
    private _isAnimating = false;

    constructor(element: HTMLElement, requestFrame: FrameRequester = nextFrame) {
        this._element = element;
        this._requestFrame = requestFrame;
        element.addEventListener(
            "wheel",
            event => this.onWheel(event),
            {
                passive: false,
            }
        );
    }

    static attach(element: HTMLElement, requestFrame: FrameRequester = nextFrame): HorizontalWheel {
        return new HorizontalWheel(element, requestFrame);
    }

    private onWheel(event: WheelEvent): void {
        const isVertical = Math.abs(event.deltaY) > Math.abs(event.deltaX);
        const maxScroll = this._element.scrollWidth - this._element.clientWidth;
        if (!isVertical || maxScroll <= 0) {
            return;
        }

        event.preventDefault();
        if (!this._isAnimating) {
            this._position = this._element.scrollLeft;
            this._target = this._position;
        }

        const delta = (DeltaReaders[event.deltaMode] ?? DeltaReaders[WheelEvent.DOM_DELTA_PIXEL]!)(event, this._element);
        this._target = clamp(
            this._target + delta,
            0,
            maxScroll
        );
        if (this._isAnimating) {
            return;
        }

        this._isAnimating = true;
        this._requestFrame(() => this.step());
    }

    private step(): void {
        const distance = this._target - this._position;
        if (Math.abs(distance) <= SettleDistance) {
            this._position = this._target;
            this._element.scrollLeft = this._target;
            this._isAnimating = false;

            return;
        }

        this._position += distance * Easing;
        this._element.scrollLeft = this._position;
        this._requestFrame(() => this.step());
    }
}
