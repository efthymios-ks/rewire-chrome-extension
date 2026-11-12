import { describe, expect, test } from "vitest";
import type { PanelState } from "../../../../src/SidePanel/Core/PanelState";
import { PanelStateFactory } from "../../../../src/SidePanel/Core/PanelStateFactory";
import { InspectorSearch } from "../../../../src/SidePanel/Features/Inspector/InspectorSearch";

function searchingFor(text: string, error: string | null = null): PanelState {
    const state = PanelStateFactory.initial();

    return {
        ...state,
        search: {
            ...state.search,
            query: {
                text,
                isRegex: false,
            },
            error,
        },
    };
}

describe("InspectorSearch", () => {
    test("queryOf_WhenNothingIsTyped_ShouldBeNull", () => {
        // Arrange
        const state = searchingFor("");

        // Act
        const query = InspectorSearch.queryOf(state);

        // Assert
        expect(query).toBeNull();
    });

    test("queryOf_WhenTheRegexIsBroken_ShouldBeNull", () => {
        // Arrange
        const state = searchingFor("(", "Unterminated group");

        // Act
        const query = InspectorSearch.queryOf(state);

        // Assert
        expect(query).toBeNull();
    });

    test("queryOf_WhenSearching_ShouldReturnTheQuery", () => {
        // Arrange
        const state = searchingFor("ada");

        // Act
        const query = InspectorSearch.queryOf(state);

        // Assert
        expect(query).toEqual({
            text: "ada",
            isRegex: false,
        });
        expect(InspectorSearch.keyOf(state)).toBe("{\"text\":\"ada\",\"isRegex\":false}");
    });
});
