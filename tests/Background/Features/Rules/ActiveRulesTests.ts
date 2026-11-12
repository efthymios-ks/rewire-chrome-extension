import { describe, expect, test, vi } from "vitest";
import { ActiveRules } from "../../../../src/Background/Features/Rules/ActiveRules";
import type { IVariableStore } from "../../../../src/Background/Features/Rules/VariableStore";
import { aProfile, aRule, aSettings } from "../../../TestData";
import { settingsCacheOf } from "../../BackgroundTestData";

function capturedStore(values: Record<string, string>): IVariableStore {
    return {
        get: name => values[name] ?? null,
        set: vi.fn(),
        snapshot: () => new Map(Object.entries(values)),
        subscribe: vi.fn(),
    };
}

const Settings = aSettings({
    activeProfileId: "staging",
    profiles: [
        aProfile({
            id: "local",
            rules: [
                aRule({
                    id: "local-rule",
                }),
            ],
        }),
        aProfile({
            id: "staging",
            rules: [
                aRule({
                    id: "staging-on",
                }),
                aRule({
                    id: "staging-off",
                    enabled: false,
                }),
            ],
            variables: [
                {
                    name: "env",
                    value: "staging",
                },
                {
                    name: "token",
                    value: "typed",
                },
            ],
        }),
    ],
});

describe("ActiveRules", () => {
    test("refresh_WhenCalled_ShouldPlanOnlyTheEnabledRulesOfTheActiveProfile", () => {
        // Arrange
        const activeRules = new ActiveRules(settingsCacheOf(Settings), capturedStore({}));

        // Act
        activeRules.refresh();

        // Assert
        expect(activeRules.plans().map(plan => plan.rule.id)).toEqual(["staging-on"]);
    });

    test("simulationContext_WhenBothKindsOfVariablesExist_ShouldLetCapturedValuesWin", () => {
        // Arrange
        const activeRules = new ActiveRules(
            settingsCacheOf(Settings),
            capturedStore({
                token: "captured",
            })
        );

        // Act
        const rendered = activeRules
            .simulationContext()
            .render("{{env}}:{{token}}");

        // Assert
        expect(rendered).toBe("staging:captured");
        expect(activeRules.context().render("{{env}}")).toBe("staging");
    });
});
