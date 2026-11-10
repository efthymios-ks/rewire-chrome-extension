import { describe, expect, test } from "vitest";
import type { PanelState } from "../../../../src/SidePanel/Core/PanelState";
import { PanelStateFactory } from "../../../../src/SidePanel/Core/PanelStateFactory";
import { Store } from "../../../../src/SidePanel/Core/Store";
import { EntrySelection } from "../../../../src/SidePanel/Features/Traffic/EntrySelection";
import { aDetail, aSummary } from "../../../TestData";

describe("EntrySelection", () => {
    test("select_WhenAnotherCallIsPicked_ShouldSelectItAndDropTheOldDetail", () => {
        // Arrange
        const store = new Store<PanelState>({
            ...PanelStateFactory.initial(),
            selectedEntryId: "request-1",
            selectedEntryDetail: aDetail(),
        });

        // Act
        EntrySelection.select(store, "request-2");

        // Assert
        const state = store.getState();
        expect(state.selectedEntryId).toBe("request-2");
        expect(state.selectedEntryDetail).toBeNull();
        expect(state.selectionCount).toBe(1);
    });

    test("select_WhenTheSelectedCallIsPickedAgain_ShouldKeepItsDetailAndStillCountThePick", () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                id: "request-1",
            }),
        });
        const store = new Store<PanelState>({
            ...PanelStateFactory.initial(),
            selectedEntryId: "request-1",
            selectedEntryDetail: detail,
            selectionCount: 3,
        });

        // Act
        EntrySelection.select(store, "request-1");

        // Assert
        const state = store.getState();
        expect(state.selectedEntryDetail).toBe(detail);
        expect(state.selectionCount).toBe(4);
    });
});
