import { afterEach, describe, expect, test, vi } from "vitest";
import { RuleVariablesClient } from "../../../src/Common/Storage/RuleVariablesClient";
import type { ProfileVariable } from "../../../src/Contracts/Settings/ProfileVariable";

type ChangeListener = (changes: Record<string, { newValue?: unknown }>, areaName: string) => void;

function stubChrome(stored: unknown): ChangeListener[] {
    const listeners: ChangeListener[] = [];
    vi.stubGlobal("chrome", {
        storage: {
            session: {
                get: vi.fn().mockResolvedValue({
                    ruleVariables: stored,
                }),
            },
            onChanged: {
                addListener: (listener: ChangeListener) => listeners.push(listener),
            },
        },
    });

    return listeners;
}

describe("RuleVariablesClient", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("load_WhenStoredValuesAreMixed_ShouldKeepOnlyNamedTextValues", async () => {
        // Arrange
        stubChrome([
            {
                name: "token",
                value: "abc",
            },
            {
                name: "count",
                value: 3,
            },
            "junk",
        ]);

        // Act
        const loaded = await new RuleVariablesClient().load();

        // Assert
        expect(loaded).toEqual({
            hasErrors: false,
            value: [
                {
                    name: "token",
                    value: "abc",
                },
            ],
        });
    });

    test("subscribe_WhenSessionVariablesChange_ShouldPassTheNewList", () => {
        // Arrange
        const listeners = stubChrome([]);
        const received: ProfileVariable[][] = [];
        new RuleVariablesClient().subscribe(variables => received.push(variables));

        // Act
        listeners.forEach(listener => listener(
            {
                ruleVariables: {
                    newValue: [
                        {
                            name: "userId",
                            value: "42",
                        },
                    ],
                },
            },
            "local"
        ));
        listeners.forEach(listener => listener(
            {
                ruleVariables: {
                    newValue: [
                        {
                            name: "userId",
                            value: "43",
                        },
                    ],
                },
            },
            "session"
        ));

        // Assert
        expect(received).toEqual([
            [
                {
                    name: "userId",
                    value: "43",
                },
            ],
        ]);
    });
});
