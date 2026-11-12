import { describe, expect, test } from "vitest";
import { ViewId } from "../../../../src/SidePanel/Core/ViewId";
import { RequestHeadersTab } from "../../../../src/SidePanel/Features/Inspector/RequestHeadersTab";
import { aToken } from "../../../Common/Jwt/JwtTestData";
import { aDetail } from "../../../TestData";
import { aPanelHarness, click } from "../../PanelTestData";

describe("RequestHeadersTab", () => {
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
        const root = new RequestHeadersTab(harness.context).render(detail);

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
        const root = new RequestHeadersTab(aPanelHarness().context).render(detail);

        // Assert
        expect(root.querySelector(".detail-action")).toBeNull();
    });

    test("render_WhenACookieHeaderIsSent_ShouldListEachCookieWithItsFullValue", () => {
        // Arrange
        const detail = aDetail({
            requestHeaders: [
                {
                    name: "Cookie",
                    value: "MC1=GUID=df848449e0aa403cbcf129537989562c&HASH=df84; MS0=ab4b1bd4a5094e29aed79e9812fbcc6d",
                },
            ],
        });

        // Act
        const root = new RequestHeadersTab(aPanelHarness().context).render(detail);

        // Assert
        const cookies = root.querySelector(".cookie-table")!;
        expect([...cookies.querySelectorAll("dd")].map(value => value.textContent)).toEqual([
            "GUID=df848449e0aa403cbcf129537989562c&HASH=df84",
            "ab4b1bd4a5094e29aed79e9812fbcc6d",
        ]);
    });
});
