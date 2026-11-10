import { describe, expect, test } from "vitest";
import { XmlText } from "../../../src/Common/Xml/XmlText";

describe("XmlText", () => {
    test("format_WhenTheXmlIsOnOneLine_ShouldIndentNestedElements", () => {
        // Arrange
        const text = "<?xml version=\"1.0\"?><order id=\"7\"><item sku=\"A\">Hello</item><empty/></order>";

        // Act
        const formatted = XmlText.format(text);

        // Assert
        expect(formatted).toBe([
            "<?xml version=\"1.0\"?>",
            "<order id=\"7\">",
            "  <item sku=\"A\">Hello</item>",
            "  <empty/>",
            "</order>",
        ].join("\n"));
    });

    test.each([
        "<order><item></order>",
        "not xml",
        "<a><![CDATA[<raw/>]]></a>",
    ])("format_WhenTheTextCannotBeFormatted(%s)_ShouldReturnItAsIs", text => {
        // Arrange
        const input = text;

        // Act
        const formatted = XmlText.format(input);

        // Assert
        expect(formatted).toBe(input);
    });
});
