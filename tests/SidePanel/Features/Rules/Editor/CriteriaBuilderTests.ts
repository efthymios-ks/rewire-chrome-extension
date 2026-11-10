import { describe, expect, test, vi } from "vitest";
import { CriteriaMatches, CriterionFieldIds } from "../../../../../src/Contracts/Rules/Criterion";
import { CriteriaBuilder } from "../../../../../src/SidePanel/Features/Rules/Editor/CriteriaBuilder";
import { aCriterion } from "../../../../TestData";
import { typeInto } from "../../../PanelTestData";

function suggestionsOf(input: HTMLInputElement): string[] {
    const list = input.parentElement!.querySelector<HTMLElement>(".suggestion-list")!;

    return list.hidden ? [] : [...list.querySelectorAll(".suggestion-item")].map(item => item.textContent ?? "");
}

describe("CriteriaBuilder", () => {
    test("headerValue_WhenTheHeaderNameChanges_ShouldFollowItsSuggestions", () => {
        // Arrange
        const builder = new CriteriaBuilder(
            {
                match: CriteriaMatches.All,
                items: [
                    aCriterion({
                        field: CriterionFieldIds.RequestHeader,
                        op: "wildcard",
                        name: "Authorization",
                        value: "",
                    }),
                ],
            },
            vi.fn()
        );
        const name = builder.root.querySelector<HTMLInputElement>(".criterion-name")!;
        const value = builder.root.querySelector<HTMLInputElement>(".criterion-value")!;

        // Act
        typeInto(value, "a");
        const forAuthorization = suggestionsOf(value);
        typeInto(name, "Accept");
        typeInto(value, "application/x");
        const forAccept = suggestionsOf(value);

        // Assert
        expect(forAuthorization).toEqual([]);
        expect(forAccept).toContain("application/xml");
    });

    test("contentTypeValue_WhenTyped_ShouldSuggestMediaTypes", () => {
        // Arrange
        const builder = new CriteriaBuilder(
            {
                match: CriteriaMatches.All,
                items: [
                    aCriterion({
                        field: CriterionFieldIds.ContentType,
                        op: "wildcard",
                        value: "",
                    }),
                ],
            },
            vi.fn()
        );
        const value = builder.root.querySelector<HTMLInputElement>(".criterion-value")!;

        // Act
        typeInto(value, "image/p");

        // Assert
        expect(suggestionsOf(value)).toEqual(["image/png"]);
    });
});
