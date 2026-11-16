const FRAME_INTERVAL_IN_MILLISECONDS = 16;

export class RenderScheduler {
    private readonly _render: () => void;
    private _isScheduled = false;

    constructor(render: () => void) {
        this._render = render;
    }

    schedule(): void {
        if (this._isScheduled) {
            return;
        }

        this._isScheduled = true;
        setTimeout(
            /* callback: */ () => {
                this._isScheduled = false;
                this._render();
            },
            /* delay: */ FRAME_INTERVAL_IN_MILLISECONDS,
        );
    }
}
