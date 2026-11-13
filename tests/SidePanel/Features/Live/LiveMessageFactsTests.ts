import { describe, expect, test } from "vitest";
import { LiveMessageDirection } from "../../../../src/Contracts/Live/LiveMessageDirection";
import { LiveMessageFacts } from "../../../../src/SidePanel/Features/Live/LiveMessageFacts";
import { aLiveMessage } from "../../../TestData";

describe("LiveMessageFacts", () => {
    test("ofFrame_WhenAFrameIsSent_ShouldListDirectionOpcodeSizeAndTime", () => {
        // Arrange
        const message = aLiveMessage({
            direction: LiveMessageDirection.Sent,
            opcode: 1,
            size: 16,
        });

        // Act
        const facts = LiveMessageFacts.ofFrame(message);

        // Assert
        expect(facts).toEqual([
            "Sent",
            "opcode 1 (text)",
            "16 B",
            "10:00:01.250",
        ]);
    });

    test.each([
        [
            9,
            true,
        ],
        [
            1,
            false,
        ],
        [
            null,
            false,
        ],
    ])("isControl_WhenTheOpcodeIs(%s)_ShouldSay(%s)", (opcode, expected) => {
        // Arrange
        const message = aLiveMessage({
            opcode,
        });

        // Act
        const isControl = LiveMessageFacts.isControl(message);

        // Assert
        expect(isControl).toBe(expected);
    });

    test("ofEvent_WhenAnEventHasNoNameOrId_ShouldSayMessageAndNone", () => {
        // Arrange
        const message = aLiveMessage({
            opcode: null,
            size: 0,
            data: null,
        });

        // Act
        const facts = LiveMessageFacts.ofEvent(message);

        // Assert
        expect(facts.slice(0, 4)).toEqual([
            "event message",
            "id none",
            "retry none",
            "0 B",
        ]);
    });
});
