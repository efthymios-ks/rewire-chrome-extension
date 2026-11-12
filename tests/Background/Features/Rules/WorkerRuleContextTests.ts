import { describe, expect, test, vi } from "vitest";
import type { IVariableStore } from "../../../../src/Background/Features/Rules/VariableStore";
import { WorkerRuleContext } from "../../../../src/Background/Features/Rules/WorkerRuleContext";

function storeOf(values: Record<string, string>): IVariableStore {
    return {
        get: name => values[name] ?? null,
        set: vi.fn(),
        snapshot: () => new Map(Object.entries(values)),
        subscribe: vi.fn(),
    };
}

const Typed: Record<string, string> = {
    token: "typed-token",
    baseUrl: "http://localhost:5000",
};

function typedLookup(name: string): string | null {
    return Typed[name] ?? null;
}

describe("WorkerRuleContext", () => {
    test("variable_WhenARuleCapturedTheName_ShouldWinOverTheTypedValue", () => {
        // Arrange
        const context = new WorkerRuleContext(
            storeOf({
                token: "captured-token",
            }),
            typedLookup
        );

        // Act
        const rendered = context.render("{{token}} at {{baseUrl}}");

        // Assert
        expect(rendered).toBe("captured-token at http://localhost:5000");
    });

    test("variable_WhenNeitherHasTheName_ShouldReturnNull", () => {
        // Arrange
        const context = new WorkerRuleContext(storeOf({}), typedLookup);

        // Act
        const value = context.variable("missing");

        // Assert
        expect(value).toBeNull();
    });

    test("setVariable_WhenCalled_ShouldWriteToTheCapturedStore", () => {
        // Arrange
        const store = storeOf({});
        const context = new WorkerRuleContext(store, typedLookup);

        // Act
        context.setVariable("userId", "42");

        // Assert
        expect(store.set).toHaveBeenCalledWith("userId", "42");
    });
});
