import { describe, expect, test } from "vitest";
import { ChangeArea } from "../../../../src/Contracts/Rules/ValueChange";
import { GeneralTab } from "../../../../src/SidePanel/Features/Inspector/GeneralTab";
import { aDetail, aSummary } from "../../../TestData";
import { aPanelHarness, buttonNamed, click, nextRender } from "../../PanelTestData";

describe("GeneralTab", () => {
    test("render_WhenTheAnswerHasNoReasonPhrase_ShouldShowTheStandardOne", () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                statusCode: 404,
                statusText: "",
            }),
        });

        // Act
        const root = new GeneralTab(aPanelHarness().context).render(detail);

        // Assert
        expect(root.textContent).toContain("404 Not Found");
    });

    test("render_WhenARuleRewroteTheUrl_ShouldTagTheUrlModified", () => {
        // Arrange
        const detail = aDetail({
            changes: [
                {
                    area: ChangeArea.Url,
                    name: "url",
                    before: "https://api.example.com/old",
                    after: "https://api.example.com/api/v1/users/42/profile",
                },
            ],
        });

        // Act
        const root = new GeneralTab(aPanelHarness().context).render(detail);

        // Assert
        const tag = root.querySelector<HTMLElement>(".modified-tag");
        expect(tag?.parentElement?.textContent).toBe("URLModified");
        expect(tag?.title).toBe("Updated by a rule. Was: https://api.example.com/old");
    });

    test("copyUrl_WhenClicked_ShouldCopyTheFullUrl", async () => {
        // Arrange
        const harness = aPanelHarness();
        const root = new GeneralTab(harness.context).render(aDetail());

        // Act
        click(buttonNamed(root, "Copy URL"));
        await nextRender();

        // Assert
        expect(harness.copied).toEqual(["https://api.example.com/api/v1/users/42/profile"]);
        expect(harness.noticeText()).toBe("URL copied.");
    });
});
