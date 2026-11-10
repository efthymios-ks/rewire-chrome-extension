import { describe, expect, test } from "vitest";
import { PanelStateFactory } from "../../../src/SidePanel/Core/PanelStateFactory";
import { Store } from "../../../src/SidePanel/Core/Store";
import { ViewId } from "../../../src/SidePanel/Core/ViewId";
import { ViewLauncher } from "../../../src/SidePanel/Core/ViewLauncher";

describe("ViewLauncher", () => {
    test("openClient_WhenGivenARequest_ShouldSwitchToTheClientWithIt", () => {
        // Arrange
        const store = new Store(PanelStateFactory.initial());
        const snapshot = {
            method: "GET",
            url: "https://api.example.com/users",
            headers: [],
            body: null,
        };

        // Act
        new ViewLauncher(store).openClient(snapshot);

        // Assert
        const state = store.getState();
        expect(state.activeView).toBe(ViewId.Client);
        expect(state.clientLaunch?.snapshot).toEqual(snapshot);
    });

    test("openJwt_WhenGivenAToken_ShouldSwitchToTheJwtTabWithIt", () => {
        // Arrange
        const store = new Store(PanelStateFactory.initial());

        // Act
        new ViewLauncher(store).openJwt("Bearer abc.def.ghi");

        // Assert
        const state = store.getState();
        expect(state.activeView).toBe(ViewId.Jwt);
        expect(state.jwtLaunch?.token).toBe("Bearer abc.def.ghi");
    });
});
