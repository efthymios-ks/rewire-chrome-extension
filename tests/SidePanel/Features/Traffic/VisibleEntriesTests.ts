import { describe, expect, test } from "vitest";
import { ContentKind } from "../../../../src/Contracts/Timeline/ContentKind";
import { ContentFilterId } from "../../../../src/SidePanel/Core/ContentFilterId";
import type { PanelState } from "../../../../src/SidePanel/Core/PanelState";
import { PanelStateFactory } from "../../../../src/SidePanel/Core/PanelStateFactory";
import { VisibleEntries } from "../../../../src/SidePanel/Features/Traffic/VisibleEntries";
import { aSummary } from "../../../TestData";

function aState(overrides: Partial<PanelState>): PanelState {
    return {
        ...PanelStateFactory.initial(),
        ...overrides,
    };
}

const entries = [
    aSummary({
        id: "json-api",
        contentKind: ContentKind.Json,
    }),
    aSummary({
        id: "graphql",
        contentKind: ContentKind.GraphQl,
    }),
    aSummary({
        id: "analytics",
        host: "www.google-analytics.com",
        contentKind: ContentKind.Other,
    }),
];

describe("VisibleEntries", () => {
    test("of_WhenNoFilterIsSet_ShouldReturnNewestFirst", () => {
        // Arrange
        const state = aState({
            entries,
        });

        // Act
        const visible = VisibleEntries.of(state);

        // Assert
        expect(visible.map(entry => entry.id)).toEqual([
            "analytics",
            "graphql",
            "json-api",
        ]);
    });

    test("of_WhenAContentFilterIsSet_ShouldKeepOnlyTheKind", () => {
        // Arrange
        const state = aState({
            entries,
            contentFilter: ContentFilterId.GraphQl,
        });

        // Act
        const visible = VisibleEntries.of(state);

        // Assert
        expect(visible.map(entry => entry.id)).toEqual(["graphql"]);
    });
});
