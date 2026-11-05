import { describe, expect, test } from "vitest";
import { XmlParser } from "../../../src/Common/Paths/XmlParser";

describe("XmlParser", () => {
    test("parse_WhenGivenASelfClosingTag_ShouldReturnARootWithNoChildren", () => {
        // Arrange
        const xml = "<root />";

        // Act
        const result = XmlParser.parse(xml);

        // Assert
        expect(result.hasErrors).toBe(false);
        if (!result.hasErrors) {
            expect(result.value).toMatchObject({
                name: "root",
                attributes: {},
                children: [],
            });
        }
    });

    test("parse_WhenGivenNestedElements_ShouldBuildATree", () => {
        // Arrange
        const xml = "<order id=\"1\"><item sku=\"A\">Hello</item><item sku=\"B\">World</item></order>";

        // Act
        const result = XmlParser.parse(xml);

        // Assert
        expect(result.hasErrors).toBe(false);
        if (result.hasErrors) {
            return;
        }

        const root = result.value;
        expect(root.name).toBe("order");
        expect(root.attributes["id"]).toBe("1");
        expect(root.children).toHaveLength(2);
        expect(root.children[0]?.name).toBe("item");
        expect(root.children[0]?.text).toBe("Hello");
        expect(root.children[1]?.attributes["sku"]).toBe("B");
    });

    test("parse_WhenGivenEntities_ShouldDecodeThem", () => {
        // Arrange
        const xml = "<root attr=\"a&amp;b\">1 &lt; 2</root>";

        // Act
        const result = XmlParser.parse(xml);

        // Assert
        expect(result.hasErrors).toBe(false);
        if (!result.hasErrors) {
            expect(result.value.attributes["attr"]).toBe("a&b");
            expect(result.value.text).toBe("1 < 2");
        }
    });

    test("parse_WhenGivenCData_ShouldKeepTheLiteralText", () => {
        // Arrange
        const xml = "<root><![CDATA[<raw>text</raw>]]></root>";

        // Act
        const result = XmlParser.parse(xml);

        // Assert
        expect(result.hasErrors).toBe(false);
        if (!result.hasErrors) {
            expect(XmlParser.textOf(result.value)).toBe("<raw>text</raw>");
        }
    });

    test("parse_WhenGivenAProlog_ShouldStripIt", () => {
        // Arrange
        const xml = "<?xml version=\"1.0\"?><root/>";

        // Act
        const result = XmlParser.parse(xml);

        // Assert
        expect(result.hasErrors).toBe(false);
        if (!result.hasErrors) {
            expect(result.value.name).toBe("root");
        }
    });

    test.each([
        "<root><a></root>",
        "<root>",
        "<>",
        "no xml here",
        "<a/><b/>",
    ])("parse_WhenGivenInvalidXml(%s)_ShouldFail", xml => {
        // Arrange
        const document = xml;

        // Act
        const result = XmlParser.parse(document);

        // Assert
        expect(result.hasErrors).toBe(true);
    });

    test("textOf_WhenNodeHasChildrenWithText_ShouldConcatenateAllText", () => {
        // Arrange
        const result = XmlParser.parse("<root><a>Hello</a><b>world</b></root>");
        if (result.hasErrors) {
            return;
        }

        // Act
        const text = XmlParser.textOf(result.value);

        // Assert
        expect(text).toBe("Helloworld");
    });
});
