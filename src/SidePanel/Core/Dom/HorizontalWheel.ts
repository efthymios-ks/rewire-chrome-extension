const EASING = 0.25;
const SETTLE_DISTANCE = 1;
const PIXELS_PER_LINE = 16;

export type FrameRequester = (step: () => void) => void;

type DeltaReader = (event: WheelEvent, element: HTMLElement) => number;

const DELTA_READERS: Record<number, DeltaReader> = {
    [WheelEvent.DOM_DELTA_PIXEL]: event => event.deltaY,
    [WheelEvent.DOM_DELTA_LINE]: event => event.deltaY * PIXELS_PER_LINE,
    [WheelEvent.DOM_DELTA_PAGE]: (event, element) => event.deltaY * element.clientWidth,
};

interface ClampOptions {
    value: number;
    min: number;
    max: number;
}

function clamp({ value, min, max }: ClampOptions): number {
    return Math.min(
        /* values: */ max,
        /* values: */ Math.max(min, value),
    );
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
            /* type: */ 'wheel',
            /* listener: */ event => this.onWheel(event),
            /* options: */ {
                passive: false,
            },
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

        const readDelta = DELTA_READERS[event.deltaMode] ?? DELTA_READERS[WheelEvent.DOM_DELTA_PIXEL]!;
        const delta = readDelta(event, this._element);
        this._target = clamp({ value: this._target + delta, min: 0, max: maxScroll });
        if (this._isAnimating) {
            return;
        }

        this._isAnimating = true;
        this._requestFrame(() => this.step());
    }

    private step(): void {
        const distance = this._target - this._position;
        if (Math.abs(distance) <= SETTLE_DISTANCE) {
            this._position = this._target;
            this._element.scrollLeft = this._target;
            this._isAnimating = false;

            return;
        }

        this._position += distance * EASING;
        this._element.scrollLeft = this._position;
        this._requestFrame(() => this.step());
    }
}
