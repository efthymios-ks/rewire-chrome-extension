import type { RequestSnapshot } from "../../Common/CodeGen/RequestSnapshot";
import type { PanelState } from "./PanelState";
import type { Store } from "./Store";
import { ViewId } from "./ViewId";

export class ViewLauncher {
    private readonly _store: Store<PanelState>;

    constructor(store: Store<PanelState>) {
        this._store = store;
    }

    openClient(snapshot: RequestSnapshot): void {
        this._store.update(state => ({
            ...state,
            activeView: ViewId.Client,
            clientLaunch: {
                snapshot,
                requestedAt: Date.now(),
            },
        }));
    }

    openJwt(token: string): void {
        this._store.update(state => ({
            ...state,
            activeView: ViewId.Jwt,
            jwtLaunch: {
                token,
                requestedAt: Date.now(),
            },
        }));
    }
}
