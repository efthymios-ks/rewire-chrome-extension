import { describe, expect, test } from "vitest";
import { JsonPath } from "../../../src/Common/Paths/JsonPath";

describe("JsonPath", () => {
    describe("objects", () => {
        const root = {
            user: {
                id: 42,
                name: "Ada",
                "first-name": "Ada",
                "with space": "ok",
                nested: {
                    deep: "value",
                },
            },
            isActive: true,
            score: 3.14,
            nullField: null,
        };

        test.each([
            [
                "$",
                root,
            ],
            [
                "$.user",
                root.user,
            ],
            [
                "$.user.name",
                "Ada",
            ],
            [
                "$.user.id",
                42,
            ],
            [
                "$.user.nested.deep",
                "value",
            ],
            [
                "$['user']['name']",
                "Ada",
            ],
            [
                "$['user'][\"nested\"].deep",
                "value",
            ],
            [
                "$.user['first-name']",
                "Ada",
            ],
            [
                "$.user['with space']",
                "ok",
            ],
            [
                "$.isActive",
                true,
            ],
            [
                "$.score",
                3.14,
            ],
            [
                "$.nullField",
                null,
            ],
        ])("select_WhenPathIs(%s)OnObjectRoot_ShouldReturn(%j)", (path, expected) => {
            // Arrange
            const expression = path;

            // Act
            const result = JsonPath.select(root, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toEqual(expected);
            }
        });

        test.each([
            "$.missing",
            "$.user.missing",
            "$.user.nested.missing",
            "$.user.name.notThere",
            "$.user[0]",
        ])("select_WhenPathMisses(%s)OnObjectRoot_ShouldReturnUndefined", path => {
            // Arrange
            const expression = path;

            // Act
            const result = JsonPath.select(root, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeUndefined();
            }
        });
    });

    describe("arrays", () => {
        const root = [
            {
                sku: "A",
                qty: 1,
            },
            {
                sku: "B",
                qty: 2,
            },
            {
                sku: "C",
                qty: 3,
            },
        ];

        test.each([
            [
                "$",
                root,
            ],
            [
                "$[0]",
                root[0],
            ],
            [
                "$[0].sku",
                "A",
            ],
            [
                "$[2].qty",
                3,
            ],
            [
                "$[-1]",
                root[2],
            ],
            [
                "$[-1].sku",
                "C",
            ],
            [
                "$[-2].sku",
                "B",
            ],
            [
                "$.length",
                3,
            ],
            [
                "$[0].sku.length",
                1,
            ],
        ])("select_WhenPathIs(%s)OnArrayRoot_ShouldReturn(%j)", (path, expected) => {
            // Arrange
            const expression = path;

            // Act
            const result = JsonPath.select(root, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toEqual(expected);
            }
        });

        test.each([
            "$[3]",
            "$[-4]",
            "$[100]",
            "$[0].missing",
        ])("select_WhenPathMisses(%s)OnArrayRoot_ShouldReturnUndefined", path => {
            // Arrange
            const expression = path;

            // Act
            const result = JsonPath.select(root, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeUndefined();
            }
        });
    });

    describe("nested arrays and objects", () => {
        const root = {
            orders: [
                {
                    id: 1,
                    items: [
                        {
                            sku: "A",
                            tags: [
                                "red",
                                "small",
                            ],
                        },
                        {
                            sku: "B",
                            tags: [],
                        },
                    ],
                },
                {
                    id: 2,
                    items: [],
                },
            ],
            matrix: [
                [
                    1,
                    2,
                    3,
                ],
                [
                    4,
                    5,
                    6,
                ],
            ],
        };

        test.each([
            [
                "$.orders[0].id",
                1,
            ],
            [
                "$.orders[0].items[0].sku",
                "A",
            ],
            [
                "$.orders[0].items[-1].sku",
                "B",
            ],
            [
                "$.orders[0].items[0].tags[0]",
                "red",
            ],
            [
                "$.orders[0].items[0].tags.length",
                2,
            ],
            [
                "$.orders[-1].id",
                2,
            ],
            [
                "$.orders.length",
                2,
            ],
            [
                "$.orders[0].items.length",
                2,
            ],
            [
                "$.matrix[0][2]",
                3,
            ],
            [
                "$.matrix[1][-1]",
                6,
            ],
        ])("select_WhenPathIs(%s)_ShouldReturn(%j)", (path, expected) => {
            // Arrange
            const expression = path;

            // Act
            const result = JsonPath.select(root, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toEqual(expected);
            }
        });

        test.each([
            "$.orders[0].items[5]",
            "$.orders[0].items[0].tags[2]",
            "$.orders[-1].items[0]",
            "$.matrix[5][0]",
            "$.notThere[0]",
        ])("select_WhenPathMisses(%s)_ShouldReturnUndefined", path => {
            // Arrange
            const expression = path;

            // Act
            const result = JsonPath.select(root, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeUndefined();
            }
        });
    });

    describe("non-matching types", () => {
        test("select_WhenIndexingAnObject_ShouldReturnUndefined", () => {
            // Arrange
            const document = {
                a: 1,
            };

            // Act
            const result = JsonPath.select(document, "$[0]");

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeUndefined();
            }
        });

        test("select_WhenAccessingAPropertyOnArray_ShouldReturnUndefined", () => {
            // Arrange
            const document = [
                1,
                2,
            ];

            // Act
            const result = JsonPath.select(document, "$.missing");

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeUndefined();
            }
        });

        test("select_WhenAccessingAPropertyOnString_ShouldReturnUndefined", () => {
            // Arrange
            const document = "hello";

            // Act
            const result = JsonPath.select(document, "$.missing");

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeUndefined();
            }
        });

        test("select_WhenAccessingLengthOnNumber_ShouldReturnUndefined", () => {
            // Arrange
            const document = 42;

            // Act
            const result = JsonPath.select(document, "$.length");

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeUndefined();
            }
        });

        test("select_WhenAccessingLengthOnNull_ShouldReturnUndefined", () => {
            // Arrange
            const document = null;

            // Act
            const result = JsonPath.select(document, "$.length");

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeUndefined();
            }
        });
    });

    describe("malformed paths", () => {
        test.each([
            "",
            "user.name",
            "$..name",
            "$.user.",
            "$.user[",
            "$.user[abc]",
            "$.user[1.5]",
            "$['unclosed",
            "$[\"mismatch']",
        ])("select_WhenPathIsMalformed(%s)_ShouldFail", path => {
            // Arrange
            const document = {
                user: {
                    name: "Ada",
                },
            };

            // Act
            const result = JsonPath.select(document, path);

            // Assert
            expect(result.hasErrors).toBe(true);
        });
    });

    describe("validate", () => {
        test.each([
            "$",
            "$.foo",
            "$.foo.bar.baz",
            "$[0]",
            "$[-1]",
            "$['key with space']",
            "$.foo['bar']",
            "$.foo.length",
        ])("validate_WhenPathIsWellFormed(%s)_ShouldPass", path => {
            // Arrange
            const expression = path;

            // Act
            const result = JsonPath.validate(expression);

            // Assert
            expect(result.hasErrors).toBe(false);
        });

        test.each([
            "",
            "foo",
            "$..foo",
            "$.",
            "$.foo[",
        ])("validate_WhenPathIsMalformed(%s)_ShouldFail", path => {
            // Arrange
            const expression = path;

            // Act
            const result = JsonPath.validate(expression);

            // Assert
            expect(result.hasErrors).toBe(true);
        });
    });
});
