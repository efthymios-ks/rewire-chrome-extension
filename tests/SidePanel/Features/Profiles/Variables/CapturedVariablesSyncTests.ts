import { describe, expect, test, vi } from "vitest";
import { Result } from "../../../../../src/Common/Results/Result";
import type { IRuleVariablesClient } from "../../../../../src/Common/Storage/IRuleVariablesClient";
import type { ProfileVariable } from "../../../../../src/Contracts/Settings/ProfileVariable";
import type { PanelState } from "../../../../../src/SidePanel/Core/PanelState";
import { PanelStateFactory } from "../../../../../src/SidePanel/Core/PanelStateFactory";
import { Store } from "../../../../../src/SidePanel/Core/Store";
import { CapturedVariablesSync } from "../../../../../src/SidePanel/Features/Profiles/Variables/CapturedVariablesSync";

const Captured: ProfileVariable[] = [
    {
        name: "token",
        value: "abc",
    },
];

describe("CapturedVariablesSync", () => {
    test("start_WhenStoredValuesLoad_ShouldPutThemInState", async () => {
        // Arrange
        const store = new Store<PanelState>(PanelStateFactory.initial());
        const client: IRuleVariablesClient = {
            load: vi.fn().mockResolvedValue(Result.ok(Captured)),
            subscribe: vi.fn(),
        };

        // Act
        await new CapturedVariablesSync(
            store,
            client,
            {
                warn: vi.fn(),
                error: vi.fn(),
            }
        ).start();

        // Assert
        expect(store.getState().capturedVariables).toEqual(Captured);
    });

    test("start_WhenARuleCapturesLater_ShouldFollowTheChange", async () => {
        // Arrange
        const store = new Store<PanelState>(PanelStateFactory.initial());
        let notify: (variables: ProfileVariable[]) => void = () => undefined;
        const client: IRuleVariablesClient = {
            load: vi.fn().mockResolvedValue(Result.ok([])),
            subscribe: listener => {
                notify = listener;
            },
        };
        await new CapturedVariablesSync(
            store,
            client,
            {
                warn: vi.fn(),
                error: vi.fn(),
            }
        ).start();

        // Act
        notify(Captured);

        // Assert
        expect(store.getState().capturedVariables).toEqual(Captured);
    });

    test("start_WhenLoadingFails_ShouldWarnAndKeepTheListEmpty", async () => {
        // Arrange
        const store = new Store<PanelState>(PanelStateFactory.initial());
        const warn = vi.fn();
        const client: IRuleVariablesClient = {
            load: vi.fn().mockResolvedValue(Result.fail("Storage is gone.")),
            subscribe: vi.fn(),
        };

        // Act
        await new CapturedVariablesSync(
            store,
            client,
            {
                warn,
                error: vi.fn(),
            }
        ).start();

        // Assert
        expect(warn).toHaveBeenCalledWith("Storage is gone.");
        expect(store.getState().capturedVariables).toEqual([]);
    });
});
