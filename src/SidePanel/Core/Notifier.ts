import type { NoticeAction } from './NoticeAction';
import { PANEL_LIMITS } from './PanelLimits';
import type { PanelState } from './PanelState';
import type { Store } from './Store';

export class Notifier {
    private readonly _store: Store<PanelState>;
    private _clearTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(store: Store<PanelState>) {
        this._store = store;
    }

    show(message: string, action: NoticeAction | null = null): void {
        this._store.update(state => ({
            ...state,
            notice: {
                message,
                action,
            },
        }));

        if (this._clearTimer != null) {
            clearTimeout(this._clearTimer);
        }

        const duration = action == null
            ? PANEL_LIMITS.NoticeDurationInMilliseconds
            : PANEL_LIMITS.UndoDurationInMilliseconds;
        this._clearTimer = setTimeout(() => this.dismiss(), duration);
    }

    dismiss(): void {
        this._store.update(state => ({
            ...state,
            notice: null,
        }));
    }
}
