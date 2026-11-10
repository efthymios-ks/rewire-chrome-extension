import { describe, expect, test, vi } from "vitest";
import { ChangeArea } from "../../../../src/Contracts/Rules/ValueChange";
import { DetailSections } from "../../../../src/SidePanel/Features/Inspector/DetailSections";
import { click } from "../../PanelTestData";

const Headers = [
    {
        name: "Authorization",
        value: "Bearer token",
    },
    {
        name: "Accept",
        value: "*/*",
    },
];

describe("DetailSections", () => {
    test("headers_WhenAnActionIsGivenForAHeader_ShouldPutAnIconButtonNextToItsValue", () => {
        // Arrange
        const run = vi.fn();

        // Act
        const root = DetailSections.headers(
            Headers,
            [],
            ChangeArea.RequestHeader,
            header => header.name === "Authorization"
                ? {
                    label: "Open in the JWT tab",
                    icon: "J",
                    run,
                }
                : undefined
        );
        click(root.querySelector(".detail-action"));

        // Assert
        expect(root.querySelectorAll(".detail-action")).toHaveLength(1);
        expect(root.querySelector(".detail-action")?.getAttribute("aria-label")).toBe("Open in the JWT tab");
        expect(run).toHaveBeenCalledOnce();
    });

    test("headers_WhenARuleChangedAHeader_ShouldMarkNameAndValue", () => {
        // Arrange
        const changes = [
            {
                area: ChangeArea.RequestHeader,
                name: "accept",
                before: null,
                after: "*/*",
            },
        ];

        // Act
        const root = DetailSections.headers(
            Headers,
            changes,
            ChangeArea.RequestHeader
        );

        // Assert
        expect([...root.querySelectorAll(".changed")].map(element => `${element.tagName}:${element.textContent}`)).toEqual([
            "DT:Accept",
            "DD:*/*",
        ]);
    });

    test("headers_WhenThereAreNone_ShouldSayNone", () => {
        // Arrange
        const headers: typeof Headers = [];

        // Act
        const root = DetailSections.headers(
            headers,
            [],
            ChangeArea.RequestHeader
        );

        // Assert
        expect(root.textContent).toBe("None.");
    });
});
