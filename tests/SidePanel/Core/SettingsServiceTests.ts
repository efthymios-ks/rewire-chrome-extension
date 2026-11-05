import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Result } from "../../../src/Common/Results/Result";
import type { ISettingsStorageClient } from "../../../src/Common/Storage/ISettingsStorageClient";
import type { PanelSettings } from "../../../src/Contracts/Settings/PanelSettings";
import { Notifier } from "../../../src/SidePanel/Core/Notifier";
import { PanelStateFactory } from "../../../src/SidePanel/Core/PanelStateFactory";
import { SettingsService } from "../../../src/SidePanel/Core/SettingsService";
import { Store } from "../../../src/SidePanel/Core/Store";
import { aRule, aSettings } from "../../TestData";

function setUp(settings: PanelSettings) {
    const store = new Store({
        ...PanelStateFactory.initial(),
        settings,
    });
    const storageClient: ISettingsStorageClient = {
        load: vi.fn().mockResolvedValue(Result.ok(settings)),
        save: vi.fn().mockResolvedValue(Result.done()),
        subscribe: vi.fn(),
    };
    const service = new SettingsService({
        store,
        storageClient,
        notifier: new Notifier(store),
        logger: {
            warn: vi.fn(),
            error: vi.fn(),
        },
    });

    return {
        store,
        service,
    };
}

describe("SettingsService", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test("removeRule_WhenUndoIsPressed_ShouldPutTheRuleBackInPlace", async () => {
        // Arrange
        const { store, service } = setUp(aSettings({
            rules: [
                aRule({
                    id: "a",
                }),
                aRule({
                    id: "b",
                }),
                aRule({
                    id: "c",
                }),
            ],
        }));
        await service.removeRule("b");

        // Act
        store.getState().notice?.action?.run();

        // Assert
        expect(service.current().rules.map(rule => rule.id)).toEqual([
            "a",
            "b",
            "c",
        ]);
    });

    test("duplicateRule_WhenCalled_ShouldPlaceTheCopyAfterTheOriginal", async () => {
        // Arrange
        const { service } = setUp(aSettings({
            rules: [
                aRule({
                    id: "a",
                }),
                aRule({
                    id: "b",
                }),
            ],
        }));

        // Act
        await service.duplicateRule("a");

        // Assert
        expect(service.current().rules.map(rule => rule.name)).toEqual([
            "Users mock",
            "Users mock copy",
            "Users mock",
        ]);
    });
});
