import { afterEach, describe, expect, test, vi } from "vitest";
import { HandshakeHeaderRules } from "../../../../src/SidePanel/Features/WsClient/HandshakeHeaderRules";

function stubChrome() {
    const updateSessionRules = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
        declarativeNetRequest: {
            updateSessionRules,
        },
    });

    return updateSessionRules;
}

describe("HandshakeHeaderRules", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("add_WhenHeadersAreGiven_ShouldSetThemOnThatSocketUrlOnly", async () => {
        // Arrange
        const updateSessionRules = stubChrome();
        const rules = new HandshakeHeaderRules();

        // Act
        const added = await rules.add(
            "wss://live.example.com/socket",
            [
                {
                    name: "Authorization",
                    value: "Bearer abc",
                },
            ]
        );

        // Assert
        expect(added).toEqual({
            hasErrors: false,
            value: 1_000_000,
        });
        expect(updateSessionRules).toHaveBeenCalledWith({
            addRules: [
                {
                    id: 1_000_000,
                    priority: 1,
                    action: {
                        type: "modifyHeaders",
                        requestHeaders: [
                            {
                                header: "Authorization",
                                operation: "set",
                                value: "Bearer abc",
                            },
                        ],
                    },
                    condition: {
                        urlFilter: "|wss://live.example.com/socket|",
                        resourceTypes: ["websocket"],
                        tabIds: [-1],
                    },
                },
            ],
        });
    });

    test("remove_WhenTheSocketCloses_ShouldRemoveTheRule", async () => {
        // Arrange
        const updateSessionRules = stubChrome();
        const rules = new HandshakeHeaderRules();

        // Act
        await rules.remove(1_000_000);

        // Assert
        expect(updateSessionRules).toHaveBeenCalledWith({
            removeRuleIds: [1_000_000],
        });
    });
});
