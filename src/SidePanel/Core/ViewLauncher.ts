import type { RequestSnapshot } from '../../Common/CodeGen/RequestSnapshot';
import type { PanelState } from './PanelState';
import type { Store } from './Store';
import { VIEW_ID } from './ViewId';

export class ViewLauncher {
    private readonly _store: Store<PanelState>;

    constructor(store: Store<PanelState>) {
        this._store = store;
    }

    openClient(snapshot: RequestSnapshot): void {
        this._store.update(state => ({
            ...state,
            activeView: VIEW_ID.Client,
            clientLaunch: {
                snapshot,
                requestedAt: Date.now(),
            },
        }));
    }

    openJwt(token: string): void {
        this._store.update(state => ({
            ...state,
            activeView: VIEW_ID.Jwt,
            jwtLaunch: {
                token,
                requestedAt: Date.now(),
            },
        }));
    }
}
