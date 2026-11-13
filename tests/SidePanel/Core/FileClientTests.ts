import { afterEach, describe, expect, test, vi } from "vitest";
import { FileClient } from "../../../src/SidePanel/Core/FileClient";

function pickWith(files: File[]): void {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
        Object.defineProperty(this, "files", {
            value: files,
        });
        this.dispatchEvent(new Event(files.length === 0 ? "cancel" : "change"));
    });
}

describe("FileClient", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("pickNamedText_WhenAFileIsPicked_ShouldReturnItsNameAndText", async () => {
        // Arrange
        pickWith([new File(["{\"log\":{}}"], "staging.har")]);

        // Act
        const picked = await new FileClient().pickNamedText(".har");

        // Assert
        expect(picked).toEqual({
            hasErrors: false,
            value: {
                name: "staging.har",
                text: "{\"log\":{}}",
            },
        });
    });

    test("pickNamedText_WhenThePickIsCancelled_ShouldReturnNull", async () => {
        // Arrange
        pickWith([]);

        // Act
        const picked = await new FileClient().pickNamedText(".har");

        // Assert
        expect(picked).toEqual({
            hasErrors: false,
            value: null,
        });
    });

    test("pickText_WhenAFileIsPicked_ShouldReturnOnlyItsText", async () => {
        // Arrange
        pickWith([new File(["hello"], "notes.txt")]);

        // Act
        const picked = await new FileClient().pickText(".txt");

        // Assert
        expect(picked).toEqual({
            hasErrors: false,
            value: "hello",
        });
    });
});
