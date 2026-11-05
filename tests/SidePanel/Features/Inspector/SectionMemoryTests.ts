import { describe, expect, test } from "vitest";
import { SectionMemory } from "../../../../src/SidePanel/Features/Inspector/SectionMemory";

describe("SectionMemory", () => {
    test("openSectionOf_WhenNothingWasOpened_ShouldBeNull", () => {
        // Arrange
        const memory = new SectionMemory();

        // Act
        const sectionId = memory.openSectionOf("request-1");

        // Assert
        expect(sectionId).toBeNull();
    });

    test("openSectionOf_WhenTheSameCallRendersAgain_ShouldKeepTheOpenSection", () => {
        // Arrange
        const memory = new SectionMemory();
        memory.open("request-1", "responseBody");

        // Act
        const sectionId = memory.openSectionOf("request-1");

        // Assert
        expect(sectionId).toBe("responseBody");
    });

    test("openSectionOf_WhenAnotherCallIsSelected_ShouldStartCollapsed", () => {
        // Arrange
        const memory = new SectionMemory();
        memory.open("request-1", "responseBody");

        // Act
        const sectionId = memory.openSectionOf("request-2");

        // Assert
        expect(sectionId).toBeNull();
    });

    test("close_WhenAnotherSectionIsOpen_ShouldKeepThatOne", () => {
        // Arrange
        const memory = new SectionMemory();
        memory.open("request-1", "requestHeaders");
        memory.open("request-1", "responseBody");

        // Act
        memory.close("request-1", "requestHeaders");

        // Assert
        expect(memory.openSectionOf("request-1")).toBe("responseBody");
    });

    test("close_WhenTheOpenSectionCloses_ShouldForgetIt", () => {
        // Arrange
        const memory = new SectionMemory();
        memory.open("request-1", "responseBody");

        // Act
        memory.close("request-1", "responseBody");

        // Assert
        expect(memory.openSectionOf("request-1")).toBeNull();
    });
});
