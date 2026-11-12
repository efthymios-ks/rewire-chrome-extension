import { describe, expect, test } from "vitest";
import { JwtView } from "../../../../src/SidePanel/Features/Jwt/JwtView";
import { aToken } from "../../../Common/Jwt/JwtTestData";
import { aPanelHarness, nextRender, typeInto } from "../../PanelTestData";

const FarFutureInSeconds = 4_100_000_000;

function rowsOf(root: ParentNode): string[] {
    return [...root.querySelectorAll(":scope > dt")].map(term => `${term.textContent}=${term.nextElementSibling?.textContent}`);
}

function partNamed(view: JwtView, title: string): HTMLElement {
    return [...view.root.querySelectorAll<HTMLElement>(".jwt-part")].find(part => part.querySelector("h3")?.textContent === title)!;
}

function pickMode(view: JwtView, label: string): void {
    const select = view.root.querySelector<HTMLSelectElement>(".jwt-mode")!;
    select.value = [...select.options].find(option => option.textContent === label)!.value;
    select.dispatchEvent(new Event("change"));
}

describe("JwtView", () => {
    test("input_WhenATokenIsPasted_ShouldListHeaderAndClaimsAsKeysAndValues", () => {
        // Arrange
        const view = new JwtView(aPanelHarness().context);
        const token = aToken({
            sub: "42",
            exp: FarFutureInSeconds,
        });

        // Act
        typeInto(view.root.querySelector("textarea")!, `Bearer ${token}`);

        // Assert
        expect(view.root.querySelector(".jwt-output .status")?.textContent).toContain("Valid until 2099-12-03T16:53:20Z");
        expect(rowsOf(partNamed(view, "Header").querySelector("dl")!)).toEqual([
            "alg=HS256",
            "typ=JWT",
        ]);
        expect(rowsOf(partNamed(view, "Claims").querySelector("dl")!)).toEqual([
            "sub=42",
            "exp=2099-12-03T16:53:20Z (4100000000)",
        ]);
    });

    test("mode_WhenRawIsPicked_ShouldShowBothPartsAsJson", () => {
        // Arrange
        const view = new JwtView(aPanelHarness().context);
        typeInto(view.root.querySelector("textarea")!, aToken({
            sub: "42",
        }));

        // Act
        pickMode(view, "Raw");

        // Assert
        expect([...view.root.querySelectorAll(".jwt-part pre")].map(block => block.textContent)).toEqual([
            "{\n  \"alg\": \"HS256\",\n  \"typ\": \"JWT\"\n}",
            "{\n  \"sub\": \"42\"\n}",
        ]);
        expect(view.root.querySelector(".jwt-part dl")).toBeNull();
    });

    test("mode_WhenAnotherTokenIsPasted_ShouldStayOnTheChosenMode", () => {
        // Arrange
        const view = new JwtView(aPanelHarness().context);
        typeInto(view.root.querySelector("textarea")!, aToken({
            sub: "42",
        }));
        pickMode(view, "Raw");

        // Act
        typeInto(view.root.querySelector("textarea")!, aToken({
            sub: "43",
        }));

        // Assert
        expect(view.root.querySelector<HTMLSelectElement>(".jwt-mode")?.selectedOptions[0]?.textContent).toBe("Raw");
        expect(view.root.querySelectorAll(".jwt-part pre")).toHaveLength(2);
    });

    test("input_WhenAClaimHoldsJsonText_ShouldNestItsKeys", () => {
        // Arrange
        const view = new JwtView(aPanelHarness().context);
        const token = aToken({
            principals: "[{\"Type\":\"Application\",\"Keys\":{\"ID\":\"123\"}}]",
        });

        // Act
        typeInto(view.root.querySelector("textarea")!, token);

        // Assert
        const nested = partNamed(view, "Claims").querySelector(".nested-definitions")!;
        expect(rowsOf(nested)).toEqual(["0=TypeApplicationKeysID123"]);
        expect(rowsOf(nested.querySelector(".nested-definitions")!)).toEqual([
            "Type=Application",
            "Keys=ID123",
        ]);
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
