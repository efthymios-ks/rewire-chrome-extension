import { describe, expect, test } from "vitest";
import { JwtView } from "../../../../src/SidePanel/Features/Jwt/JwtView";
import { aToken } from "../../../Common/Jwt/JwtTestData";
import { aPanelHarness, nextRender, typeInto } from "../../PanelTestData";

const FarFutureInSeconds = 4_100_000_000;

describe("JwtView", () => {
    test("input_WhenATokenIsPasted_ShouldShowStatusTimesHeaderAndClaims", () => {
        // Arrange
        const view = new JwtView(aPanelHarness().context);
        const token = aToken({
            sub: "42",
            exp: FarFutureInSeconds,
        });

        // Act
        typeInto(view.root.querySelector("textarea")!, `Bearer ${token}`);

        // Assert
        const output = view.root.querySelector(".jwt-output")!.textContent ?? "";
        expect(output).toContain("Valid until 2099-12-03T16:53:20Z");
        expect(output).toContain("Expires at");
        expect(output).toContain("\"alg\": \"HS256\"");
        expect(output).toContain("\"sub\": \"42\"");
    });

    test("input_WhenTheTextIsNoJwt_ShouldShowWhy", () => {
        // Arrange
        const view = new JwtView(aPanelHarness().context);

        // Act
        typeInto(view.root.querySelector("textarea")!, "not-a-token");

        // Assert
        expect(view.root.querySelector(".form-error")?.textContent).toBe("A JWT has three parts separated by dots.");
    });

    test("jwtLaunch_WhenATokenIsOpenedFromTheInspector_ShouldLoadItWithoutTheBearerPrefix", async () => {
        // Arrange
        const harness = aPanelHarness();
        const view = new JwtView(harness.context);
        const token = aToken({
            sub: "42",
        });

        // Act
        harness.context.viewLauncher.openJwt(`Bearer ${token}`);
        await nextRender();

        // Assert
        expect(view.root.querySelector("textarea")!.value).toBe(token);
        expect(view.root.querySelector(".jwt-output")!.textContent).toContain("Never expires");
    });
});
