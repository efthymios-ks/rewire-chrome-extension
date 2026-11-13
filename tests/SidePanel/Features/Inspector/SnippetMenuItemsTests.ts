import { describe, expect, test, vi } from "vitest";
import { PowerShellSnippet } from "../../../../src/Common/CodeGen/PowerShellSnippet";
import { WgetSnippet } from "../../../../src/Common/CodeGen/WgetSnippet";
import { SnippetMenuItems } from "../../../../src/SidePanel/Features/Inspector/SnippetMenuItems";

describe("SnippetMenuItems", () => {
    test("of_WhenBuilt_ShouldOfferEveryFormatInOrder", () => {
        // Arrange
        const copy = vi.fn();

        // Act
        const items = SnippetMenuItems.of(copy);

        // Assert
        expect(items.map(item => item.label)).toEqual([
            "Copy as cURL (bash)",
            "Copy as cURL (cmd)",
            "Copy as Wget",
            "Copy as Fetch (browser)",
            "Copy as Fetch (Node.js)",
            "Copy as PowerShell",
        ]);
    });

    test("of_WhenAnItemRuns_ShouldCopyThatFormat", () => {
        // Arrange
        const copy = vi.fn();
        const items = SnippetMenuItems.of(copy);

        // Act
        items[2]?.run();

        // Assert
        expect(copy).toHaveBeenCalledWith(WgetSnippet.id);
    });

    test("copiedText_WhenAFormatIsCopied_ShouldNameIt", () => {
        // Arrange
        const snippetId = PowerShellSnippet.id;

        // Act
        const text = SnippetMenuItems.copiedText(snippetId);

        // Assert
        expect(text).toBe("PowerShell snippet copied.");
    });
});
