import { describe, expect, test } from "vitest";
import { ChangeArea } from "../../../../src/Contracts/Rules/ValueChange";
import { ResponseHeadersTab } from "../../../../src/SidePanel/Features/Inspector/ResponseHeadersTab";
import { aDetail } from "../../../TestData";

describe("ResponseHeadersTab", () => {
    test("render_WhenTheAnswerSetsCookies_ShouldListThemUnderTheHeaders", () => {
        // Arrange
        const detail = aDetail({
            responseHeaders: [
                {
                    name: "Set-Cookie",
                    value: "session=abc; Path=/; HttpOnly",
                },
            ],
        });

        // Act
        const root = new ResponseHeadersTab().render(detail);

        // Assert
        expect(root.querySelector(".cookie-table h4")?.textContent).toBe("Set-Cookie (1)");
        expect(root.querySelector(".set-cookie")?.textContent).toBe("NamesessionValueabcPath/FlagsHttpOnly");
    });

    test("render_WhenARuleChangedAHeader_ShouldTagIt", () => {
        // Arrange
        const detail = aDetail({
            responseHeaders: [
                {
                    name: "Access-Control-Allow-Origin",
                    value: "*",
                },
            ],
            changes: [
                {
                    area: ChangeArea.ResponseHeader,
                    name: "Access-Control-Allow-Origin",
                    before: null,
                    after: "*",
                },
            ],
        });

        // Act
        const root = new ResponseHeadersTab().render(detail);

        // Assert
        expect(root.querySelectorAll(".modified-tag")).toHaveLength(1);
    });
});
