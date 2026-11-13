import { describe, expect, test } from "vitest";
import { LiveListeningRegistry } from "../../../../src/Background/Features/Live/LiveListeningRegistry";
import { NoLiveListening } from "../../../../src/Contracts/Live/LiveListening";

describe("LiveListeningRegistry", () => {
    test("of_WhenTheTabWasNeverSet_ShouldListenToNothing", () => {
        // Arrange
        const registry = new LiveListeningRegistry();

        // Act
        const listening = registry.of(7);

        // Assert
        expect(listening).toEqual(NoLiveListening);
    });

    test("forget_WhenTheTabGoes_ShouldDropItsListening", () => {
        // Arrange
        const registry = new LiveListeningRegistry();
        registry.set(7, {
            ...NoLiveListening,
            eventStreams: true,
        });

        // Act
        registry.forget(7);

        // Assert
        expect(registry.of(7).eventStreams).toBe(false);
    });
});
