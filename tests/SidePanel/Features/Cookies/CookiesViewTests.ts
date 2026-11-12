import { describe, expect, test, vi } from "vitest";
import { Result } from "../../../../src/Common/Results/Result";
import { ViewId } from "../../../../src/SidePanel/Core/ViewId";
import { CookiesView } from "../../../../src/SidePanel/Features/Cookies/CookiesView";
import { aPanelHarness, nextRender, typeInto } from "../../PanelTestData";

function aCookie(name: string, value: string): chrome.cookies.Cookie {
    return {
        name,
        value,
        domain: "api.example.com",
        hostOnly: true,
        path: "/",
        secure: true,
        httpOnly: false,
        sameSite: "lax",
        session: true,
        storeId: "0",
    };
}

async function aLoadedView(): Promise<CookiesView> {
    const harness = aPanelHarness({
        activeView: ViewId.CookieJar,
        inspectedTab: {
            tabId: 7,
            url: "https://api.example.com/users",
            title: "Users",
        },
    });
    vi.mocked(harness.context.cookieClient.list).mockResolvedValue(Result.ok([
        aCookie("session", "abc123"),
        aCookie("theme", "dark"),
        aCookie("MC1", "GUID=df84&HASH=session-bound"),
    ]));
    const view = new CookiesView(harness.context);
    await nextRender();

    return view;
}

function namesOf(view: CookiesView): string[] {
    return [...view.root.querySelectorAll(".cookie-item summary .code-text")].map(name => name.textContent ?? "");
}

function searchOf(view: CookiesView): HTMLInputElement {
    return view.root.querySelector<HTMLInputElement>(".cookie-search")!;
}

describe("CookiesView", () => {
    test("constructor_WhenTheJarOpens_ShouldOfferAShortSearchBox", async () => {
        // Arrange
        const view = await aLoadedView();

        // Act
        const search = searchOf(view);

        // Assert
        expect(search.placeholder).toBe("Search name or value");
        expect(search.getAttribute("aria-label")).toBe("Search cookie names and values");
        expect(namesOf(view)).toEqual([
            "session",
            "theme",
            "MC1",
        ]);
    });

    test("search_WhenTyped_ShouldKeepCookiesWhoseNameOrValueContainsTheText", async () => {
        // Arrange
        const view = await aLoadedView();

        // Act
        typeInto(searchOf(view), "Session");

        // Assert
        expect(namesOf(view)).toEqual([
            "session",
            "MC1",
        ]);
    });

    test("search_WhenNothingMatches_ShouldSaySo", async () => {
        // Arrange
        const view = await aLoadedView();

        // Act
        typeInto(searchOf(view), "zzz");

        // Assert
        expect(view.root.querySelector(".cookie-content")?.textContent).toBe("No cookie name or value contains \"zzz\".");
    });

    test("search_WhenCleared_ShouldListEveryCookieAgain", async () => {
        // Arrange
        const view = await aLoadedView();
        typeInto(searchOf(view), "dark");

        // Act
        typeInto(searchOf(view), "");

        // Assert
        expect(namesOf(view)).toHaveLength(3);
    });
});
