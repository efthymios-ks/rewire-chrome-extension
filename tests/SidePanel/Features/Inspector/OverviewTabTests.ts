import { describe, expect, test } from "vitest";
import { PanelStateFactory } from "../../../../src/SidePanel/Core/PanelStateFactory";
import { ViewId } from "../../../../src/SidePanel/Core/ViewId";
import { OverviewTab } from "../../../../src/SidePanel/Features/Inspector/OverviewTab";
import { aToken } from "../../../Common/Jwt/JwtTestData";
import { aDetail, aSummary } from "../../../TestData";
import { aPanelHarness, click } from "../../PanelTestData";

function openRequestHeaders(root: HTMLElement): void {
    const section = [...root.querySelectorAll<HTMLDetailsElement>(".detail-section")].find(candidate => candidate.querySelector("summary")?.textContent?.startsWith("Request headers"));
    section!.open = true;
}

describe("OverviewTab", () => {
    test("render_WhenAuthorizationHoldsAJwt_ShouldOpenItInTheJwtTab", () => {
        // Arrange
        const token = `Bearer ${aToken({
            sub: "42",
        })}`;
        const harness = aPanelHarness();
        const detail = aDetail({
            requestHeaders: [
                {
                    name: "Authorization",
                    value: token,
                },
            ],
        });
        const root = new OverviewTab(harness.context).render(detail, PanelStateFactory.initial());
        openRequestHeaders(root);

        // Act
        click(root.querySelector(".detail-action"));

        // Assert
        const state = harness.store.getState();
        expect(state.activeView).toBe(ViewId.Jwt);
        expect(state.jwtLaunch?.token).toBe(token);
    });

    test("render_WhenAuthorizationIsNotAJwt_ShouldOfferNoJwtAction", () => {
        // Arrange
        const detail = aDetail({
            requestHeaders: [
                {
                    name: "Authorization",
                    value: "Basic YWRhOnNlY3JldA==",
                },
            ],
        });

        // Act
        const root = new OverviewTab(aPanelHarness().context).render(detail, PanelStateFactory.initial());

        // Assert
        expect(root.querySelector(".detail-action")).toBeNull();
    });

    test("render_WhenTheAnswerHasNoReasonPhrase_ShouldShowTheStandardOne", () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                statusCode: 404,
                statusText: "",
            }),
        });

        // Act
        const root = new OverviewTab(aPanelHarness().context).render(detail, PanelStateFactory.initial());

        // Assert
        expect(root.textContent).toContain("404 Not Found");
    });
});
