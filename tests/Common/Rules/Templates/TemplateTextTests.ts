import { describe, expect, test } from "vitest";
import { TemplateText } from "../../../../src/Common/Rules/Templates/TemplateText";

function lookupOf(values: Record<string, string>): (name: string) => string | null {
    return name => values[name] ?? null;
}

describe("TemplateText", () => {
    test("render_WhenVariablesAreKnown_ShouldReplaceEveryOccurrence", () => {
        // Arrange
        const text = "{{ host }}/users/{{id}}?again={{id}}";
        const lookup = lookupOf({
            host: "https://api.example.com",
            id: "42",
        });

        // Act
        const rendered = TemplateText.render(text, lookup);

        // Assert
        expect(rendered).toBe("https://api.example.com/users/42?again=42");
    });

    test("render_WhenVariableIsUnknown_ShouldKeepThePlaceholder", () => {
        // Arrange
        const text = "Bearer {{token}} for {{ user }}";
        const lookup = lookupOf({
            user: "ada",
        });

        // Act
        const rendered = TemplateText.render(text, lookup);

        // Assert
        expect(rendered).toBe("Bearer {{token}} for ada");
    });

    test("render_WhenVariableIsEmpty_ShouldReplaceWithEmptyText", () => {
        // Arrange
        const text = "[{{suffix}}]";
        const lookup = lookupOf({
            suffix: "",
        });

        // Act
        const rendered = TemplateText.render(text, lookup);

        // Assert
        expect(rendered).toBe("[]");
    });

    test("render_WhenValueLooksLikeReplacementPattern_ShouldInsertItLiterally", () => {
        // Arrange
        const text = "price={{price}}";
        const lookup = lookupOf({
            price: "$& $1",
        });

        // Act
        const rendered = TemplateText.render(text, lookup);

        // Assert
        expect(rendered).toBe("price=$& $1");
    });
});
