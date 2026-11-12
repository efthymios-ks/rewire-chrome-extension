import { describe, expect, test } from "vitest";
import { type JwtField, JwtFields } from "../../../../src/SidePanel/Features/Jwt/JwtFields";

function linesOf(fields: JwtField[], prefix: string = ""): string[] {
    return fields.flatMap(field => field.children.length === 0
        ? [`${prefix}${field.name} = ${field.value}`]
        : linesOf(field.children, `${prefix}${field.name} > `));
}

describe("JwtFields", () => {
    test("of_WhenValuesArePlain_ShouldListOneRowPerKey", () => {
        // Arrange
        const header = {
            alg: "RS256",
            kid: "static-key",
            typ: "JWT",
        };

        // Act
        const fields = JwtFields.of(header);

        // Assert
        expect(linesOf(fields)).toEqual([
            "alg = RS256",
            "kid = static-key",
            "typ = JWT",
        ]);
    });

    test("of_WhenATopLevelTimeClaimIsANumber_ShouldShowItAsUtcWithTheSeconds", () => {
        // Arrange
        const payload = {
            exp: 1_794_478_488,
            sub: "42",
        };

        // Act
        const fields = JwtFields.of(payload);

        // Assert
        expect(linesOf(fields)).toEqual([
            "exp = 2026-11-12T10:14:48Z (1794478488)",
            "sub = 42",
        ]);
    });

    test("of_WhenAValueIsAnArrayOrObject_ShouldBreakItDown", () => {
        // Arrange
        const payload = {
            roles: [
                "Member",
                "Admin",
            ],
            address: {
                country: "GR",
                exp: 5,
            },
        };

        // Act
        const fields = JwtFields.of(payload);

        // Assert
        expect(linesOf(fields)).toEqual([
            "roles > 0 = Member",
            "roles > 1 = Admin",
            "address > country = GR",
            "address > exp = 5",
        ]);
    });

    test("of_WhenAStringHoldsJson_ShouldBreakItDownToo", () => {
        // Arrange
        const payload = {
            principals: "[{\"Type\":\"Application\",\"Keys\":{\"ID\":\"123\"}}]",
        };

        // Act
        const fields = JwtFields.of(payload);

        // Assert
        expect(linesOf(fields)).toEqual([
            "principals > 0 > Type = Application",
            "principals > 0 > Keys > ID = 123",
        ]);
    });

    test.each([
        [
            "{not json",
            "{not json",
        ],
        [
            "[]",
            "[]",
        ],
        [
            "42",
            "42",
        ],
    ])("of_WhenAStringIsNotAJsonContainer(%s)_ShouldKeepItAsText", (value, expected) => {
        // Arrange
        const payload = {
            claim: value,
        };

        // Act
        const fields = JwtFields.of(payload);

        // Assert
        expect(linesOf(fields)).toEqual([`claim = ${expected}`]);
    });

    test("of_WhenValuesAreNotText_ShouldShowThemAsJson", () => {
        // Arrange
        const payload = {
            refreshed: true,
            count: 3,
            nothing: null,
            empty: {},
        };

        // Act
        const fields = JwtFields.of(payload);

        // Assert
        expect(linesOf(fields)).toEqual([
            "refreshed = true",
            "count = 3",
            "nothing = null",
            "empty = {}",
        ]);
    });
});
