const FrameIntervalInMilliseconds = 16;

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
            () => {
                this._isScheduled = false;
                this._render();
            },
            FrameIntervalInMilliseconds
        );
    }
}
