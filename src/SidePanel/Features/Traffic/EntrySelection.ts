import type { PanelState } from "../../Core/PanelState";
import type { Store } from "../../Core/Store";

export const EntrySelection = {
    select(store: Store<PanelState>, entryId: string): void {
        store.update(state => {
            if (state.selectedEntryId === entryId) {
                return state;
            }

            return {
                ...state,
                selectedEntryId: entryId,
                selectedEntryDetail: null,
                detailError: null,
            };
        });
    },
};
