import type { PanelState } from "../../Core/PanelState";
import type { Store } from "../../Core/Store";

export const EntrySelection = {
    select(store: Store<PanelState>, entryId: string): void {
        store.update(state => {
            const selectionCount = state.selectionCount + 1;
            if (state.selectedEntryId === entryId) {
                return {
                    ...state,
                    selectionCount,
                };
            }

            return {
                ...state,
                selectedEntryId: entryId,
                selectedEntryDetail: null,
                detailError: null,
                selectionCount,
            };
        });
    },
};
