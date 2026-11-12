import { describe, expect, test } from "vitest";
import { ProfileVariables } from "../../../src/Common/Profiles/ProfileVariables";

const Variables = [
    {
        name: "baseUrl",
        value: "http://localhost:5000",
    },
    {
        name: "apiToken",
        value: "secret",
    },
];

describe("ProfileVariables", () => {
    test.each([
        [
            "apiToken",
            true,
        ],
        [
            "SESSION_ID",
            true,
        ],
        [
            "clientSecret",
            true,
        ],
        [
            "x-api-key",
            true,
        ],
        [
            "password",
            true,
        ],
        [
            "baseUrl",
            false,
        ],
        [
            "userId",
            false,
        ],
    ])("looksSecret_WhenTheNameIs(%s)_ShouldReturn(%s)", (name, expected) => {
        // Arrange
        const variableName = name;

        // Act
        const looksSecret = ProfileVariables.looksSecret(variableName);

        // Assert
        expect(looksSecret).toBe(expected);
    });

    test("withoutSecrets_WhenANameLooksSecret_ShouldBlankOnlyItsValue", () => {
        // Arrange
        const variables = Variables;

        // Act
        const cleaned = ProfileVariables.withoutSecrets(variables);

        // Assert
        expect(cleaned).toEqual([
            {
                name: "baseUrl",
                value: "http://localhost:5000",
            },
            {
                name: "apiToken",
                value: "",
            },
        ]);
    });

    test("mergeByName_WhenNamesOverlap_ShouldTakeTheIncomingValueAndAppendNewNames", () => {
        // Arrange
        const incoming = [
            {
                name: "apiToken",
                value: "rotated",
            },
            {
                name: "tenant",
                value: "acme",
            },
        ];

        // Act
        const merged = ProfileVariables.mergeByName(Variables, incoming);

        // Assert
        expect(merged).toEqual([
            {
                name: "baseUrl",
                value: "http://localhost:5000",
            },
            {
                name: "apiToken",
                value: "rotated",
            },
            {
                name: "tenant",
                value: "acme",
            },
        ]);
    });

    test("valueOf_WhenTheNameIsMissing_ShouldReturnNull", () => {
        // Arrange
        const name = "missing";

        // Act
        const value = ProfileVariables.valueOf(Variables, name);

        // Assert
        expect(value).toBeNull();
        expect(ProfileVariables.valueOf(Variables, "baseUrl")).toBe("http://localhost:5000");
        expect(ProfileVariables.mapOf(Variables).get("apiToken")).toBe("secret");
    });
});
