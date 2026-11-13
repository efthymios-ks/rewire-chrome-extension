import { describe, expect, test, vi } from "vitest";
import { LiveSendBar } from "../../../../src/SidePanel/Features/Live/LiveSendBar";
import { buttonNamed, click } from "../../PanelTestData";

function aBar() {
    const onSend = vi.fn();
    const bar = new LiveSendBar({
        className: "ws-send",
        placeholder: "Message",
        leading: null,
        onSend,
    });
    bar.input.value = "{\"type\":\"ping\"}";

    return {
        bar,
        onSend,
    };
}

describe("LiveSendBar", () => {
    test("send_WhenSendIsClicked_ShouldPassTheText", () => {
        // Arrange
        const { bar, onSend } = aBar();

        // Act
        click(buttonNamed(bar.root, "Send"));

        // Assert
        expect(onSend).toHaveBeenCalledWith("{\"type\":\"ping\"}");
    });

    test("send_WhenEnterIsPressed_ShouldPassTheText", () => {
        // Arrange
        const { bar, onSend } = aBar();

        // Act
        bar.input.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter",
        }));

        // Assert
        expect(onSend).toHaveBeenCalledWith("{\"type\":\"ping\"}");
    });
});
