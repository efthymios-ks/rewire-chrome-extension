import { describe, expect, test } from "vitest";
import { ViewId } from "../../../../src/SidePanel/Core/ViewId";
import { ViewDefinitions } from "../../../../src/SidePanel/Features/Shell/ViewDefinitions";
import { aPanelHarness } from "../../PanelTestData";

describe("ViewDefinitions", () => {
    test("list_WhenRead_ShouldOfferEveryTabInOrder", () => {
        // Arrange
        const expected = [
            "Traffic",
            "Rules",
            "Cookie Jar",
            "Client",
            "JWT",
        ];

        // Act
        const labels = ViewDefinitions.map(definition => definition.label);

        // Assert
        expect(labels).toEqual(expected);
    });

    test.each([
        [
            ViewId.Client,
            "client-view",
        ],
        [
            ViewId.Jwt,
            "jwt-view",
        ],
    ])("create_WhenTheViewIs(%s)_ShouldBuildIt(%s)", (viewId, expected) => {
        // Arrange
        const definition = ViewDefinitions.find(candidate => candidate.id === viewId)!;

        // Act
        const root = definition.create(aPanelHarness().context);

        // Assert
        expect(root.classList.contains(expected)).toBe(true);
    });
});
