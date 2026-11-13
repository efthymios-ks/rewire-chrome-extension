import { describe, expect, test } from "vitest";
import { PanelStateFactory } from "../../../src/SidePanel/Core/PanelStateFactory";
import { PanelVariables } from "../../../src/SidePanel/Core/PanelVariables";
import { aProfile, aSettings } from "../../TestData";

describe("PanelVariables", () => {
    test("render_WhenProfileAndCapturedVariablesExist_ShouldFillThemAndPreferCaptured", () => {
        // Arrange
        const state = {
            ...PanelStateFactory.initial(),
            settings: aSettings({
                profiles: [
                    aProfile({
                        variables: [
                            {
                                name: "host",
                                value: "live.example.com",
                            },
                            {
                                name: "token",
                                value: "from-profile",
                            },
                        ],
                    }),
                ],
            }),
            capturedVariables: [
                {
                    name: "token",
                    value: "captured",
                },
            ],
        };

        // Act
        const text = PanelVariables.render(state, "wss://{{host}}/socket?token={{token}}&x={{missing}}");

        // Assert
        expect(text).toBe("wss://live.example.com/socket?token=captured&x={{missing}}");
    });
});
