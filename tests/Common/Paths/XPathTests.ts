import { describe, expect, test } from "vitest";
import { XPath } from "../../../src/Common/Paths/XPath";

describe("XPath", () => {
    describe("attribute selection", () => {
        const xml = `
            <order id="7" status="open">
                <customer name="Ada" vip="true"/>
                <items>
                    <item sku="A" kind="primary"/>
                    <item sku="B" kind="secondary"/>
                    <item sku="C" kind="primary"/>
                </items>
            </order>`;

        test.each([
            [
                "/order/@id",
                "7",
            ],
            [
                "//order/@id",
                "7",
            ],
            [
                "//@sku",
                "A",
            ],
            [
                "/order/@status",
                "open",
            ],
            [
                "/order/customer/@name",
                "Ada",
            ],
            [
                "/order/customer/@vip",
                "true",
            ],
            [
                "/order/items/item[1]/@sku",
                "A",
            ],
            [
                "/order/items/item[2]/@sku",
                "B",
            ],
            [
                "/order/items/item[-1]/@sku",
                "C",
            ],
            [
                "/order/items/item[@kind='secondary']/@sku",
                "B",
            ],
            [
                "/order/items/item[@kind='primary']/@sku",
                "A",
            ],
            [
                "//item/@sku",
                "A",
            ],
            [
                "//item[@kind='secondary']/@sku",
                "B",
            ],
        ])("select_WhenPathIs(%s)_ShouldReturn(%s)", (path, expected) => {
            // Arrange
            const expression = path;

            // Act
            const result = XPath.select(xml, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBe(expected);
            }
        });

        test.each([
            "/order/@missing",
            "/order/items/item[5]/@sku",
            "/order/items/item[@kind='ghost']/@sku",
            "//missing/@sku",
        ])("select_WhenAttributePathMisses(%s)_ShouldReturnNull", path => {
            // Arrange
            const expression = path;

            // Act
            const result = XPath.select(xml, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeNull();
            }
        });
    });

    describe("element text", () => {
        const xml = `
            <catalog>
                <product>
                    <name>Widget</name>
                    <price currency="USD">9.99</price>
                </product>
                <product>
                    <name>Gadget</name>
                    <price currency="EUR">14.50</price>
                </product>
            </catalog>`;

        test.each([
            [
                "/catalog/product/name",
                "Widget",
            ],
            [
                "/catalog/product[1]/name",
                "Widget",
            ],
            [
                "/catalog/product[2]/name",
                "Gadget",
            ],
            [
                "/catalog/product[-1]/name",
                "Gadget",
            ],
            [
                "/catalog/product[1]/price",
                "9.99",
            ],
            [
                "/catalog/product[1]/name/text()",
                "Widget",
            ],
            [
                "//name",
                "Widget",
            ],
            [
                "//name/text()",
                "Widget",
            ],
            [
                "/catalog/product[2]/price/@currency",
                "EUR",
            ],
        ])("select_WhenPathIs(%s)_ShouldReturn(%s)", (path, expected) => {
            // Arrange
            const expression = path;

            // Act
            const result = XPath.select(xml, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBe(expected);
            }
        });
    });

    describe("wildcards and descendants", () => {
        const xml = `
            <root>
                <section>
                    <h>Alpha</h>
                    <p>One</p>
                </section>
                <section>
                    <h>Beta</h>
                    <p>Two</p>
                </section>
            </root>`;

        test.each([
            [
                "//h",
                "Alpha",
            ],
            [
                "//p",
                "One",
            ],
            [
                "/root/section[2]/h",
                "Beta",
            ],
            [
                "/root/section[-1]/p",
                "Two",
            ],
        ])("select_WhenPathIs(%s)_ShouldReturn(%s)", (path, expected) => {
            // Arrange
            const expression = path;

            // Act
            const result = XPath.select(xml, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBe(expected);
            }
        });
    });

    describe("attribute predicates on nested elements", () => {
        const xml = `
            <orders>
                <order id="1" status="paid">
                    <total>10</total>
                </order>
                <order id="2" status="pending">
                    <total>20</total>
                </order>
                <order id="3" status="paid">
                    <total>30</total>
                </order>
            </orders>`;

        test.each([
            [
                "/orders/order[@status='paid']/@id",
                "1",
            ],
            [
                "/orders/order[@status='pending']/@id",
                "2",
            ],
            [
                "/orders/order[@id='3']/total",
                "30",
            ],
            [
                "//order[@status='paid']/total",
                "10",
            ],
        ])("select_WhenPathIs(%s)_ShouldReturn(%s)", (path, expected) => {
            // Arrange
            const expression = path;

            // Act
            const result = XPath.select(xml, expression);

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBe(expected);
            }
        });
    });

    describe("edge cases", () => {
        test("select_WhenRootHasEntities_ShouldDecodeThem", () => {
            // Arrange
            const document = "<msg>a &amp; b</msg>";

            // Act
            const result = XPath.select(document, "/msg");

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBe("a & b");
            }
        });

        test("select_WhenAttributeContainsQuotedEntities_ShouldDecodeThem", () => {
            // Arrange
            const document = "<msg text=\"a&amp;b\"/>";

            // Act
            const result = XPath.select(document, "/msg/@text");

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBe("a&b");
            }
        });

        test("select_WhenRootHasACdataBlock_ShouldReturnItsLiteralContent", () => {
            // Arrange
            const document = "<msg><![CDATA[<raw>hi</raw>]]></msg>";

            // Act
            const result = XPath.select(document, "/msg");

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBe("<raw>hi</raw>");
            }
        });

        test("select_WhenRootDoesNotMatchTheFirstStep_ShouldReturnNull", () => {
            // Arrange
            const document = "<other/>";

            // Act
            const result = XPath.select(document, "/root");

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeNull();
            }
        });

        test("select_WhenNothingMatches_ShouldReturnNull", () => {
            // Arrange
            const document = "<root><a/></root>";

            // Act
            const result = XPath.select(document, "/root/missing");

            // Assert
            expect(result.hasErrors).toBe(false);
            if (!result.hasErrors) {
                expect(result.value).toBeNull();
            }
        });
    });

    describe("malformed input", () => {
        test.each([
            "order/items",
            "/order[abc]",
            "/order[",
            "/order/items/item[@attr=]",
            "/",
            "",
        ])("select_WhenPathIsMalformed(%s)_ShouldFail", path => {
            // Arrange
            const document = "<root/>";

            // Act
            const result = XPath.select(document, path);

            // Assert
            expect(result.hasErrors).toBe(true);
        });

        test.each([
            "<root>",
            "<root><a></root>",
            "no xml here",
            "<a/><b/>",
        ])("select_WhenXmlIsMalformed(%s)_ShouldFail", xml => {
            // Arrange
            const expression = "/root";

            // Act
            const result = XPath.select(xml, expression);

            // Assert
            expect(result.hasErrors).toBe(true);
        });
    });

    describe("validate", () => {
        test.each([
            "/root",
            "/root/child",
            "/root/child[1]",
            "/root/child[-1]",
            "/root/child[@attr='value']",
            "/root/child/@attr",
            "//descendant",
            "//child/text()",
            "/root/*",
        ])("validate_WhenPathIsWellFormed(%s)_ShouldPass", path => {
            // Arrange
            const expression = path;

            // Act
            const result = XPath.validate(expression);

            // Assert
            expect(result.hasErrors).toBe(false);
        });

        test.each([
            "",
            "root/child",
            "/root[",
            "/root[abc]",
            "/",
        ])("validate_WhenPathIsMalformed(%s)_ShouldFail", path => {
            // Arrange
            const expression = path;

            // Act
            const result = XPath.validate(expression);

            // Assert
            expect(result.hasErrors).toBe(true);
        });
    });
});
