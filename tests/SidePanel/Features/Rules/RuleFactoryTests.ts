import { describe, expect, test } from "vitest";
import { RuleTypeRegistry } from "../../../../src/Common/Rules/Types/RuleTypeRegistry";
import { CriterionFieldIds, CriterionOperatorIds } from "../../../../src/Contracts/Rules/Criterion";
import { RuleTypeIds } from "../../../../src/Contracts/Rules/RuleTypeIds";
import { RuleFactory } from "../../../../src/SidePanel/Features/Rules/RuleFactory";
import { aDetail, aSummary } from "../../../TestData";

describe("RuleFactory", () => {
    test("create_WhenATypeIsPicked_ShouldStartEnabledWithItsDefaults", () => {
        // Arrange
        const type = RuleTypeRegistry.get(RuleTypeIds.Delay)!;

        // Act
        const rule = RuleFactory.create(type);

        // Assert
        expect(rule).toMatchObject({
            name: type.label,
            enabled: true,
            type: RuleTypeIds.Delay,
            criteria: {
                match: "all",
                items: [],
            },
            action: type.defaultAction(),
        });
    });

    test("mockOf_WhenARequestIsMocked_ShouldMatchItsMethodAndPathAndKeepTheBaseline", () => {
        // Arrange
        const detail = aDetail({
            summary: aSummary({
                method: "POST",
                url: "https://api.example.com/api/v1/orders?page=2",
                statusCode: 201,
            }),
            responseBody: "{\"id\":7}",
        });

        // Act
        const rule = RuleFactory.mockOf(detail);

        // Assert
        expect(rule.type).toBe(RuleTypeIds.MockResponse);
        expect(rule.name).toBe("Mock POST /api/v1/orders");
        expect(rule.criteria.items).toEqual([
            {
                field: CriterionFieldIds.Method,
                op: CriterionOperatorIds.OneOf,
                name: "",
                value: "POST",
                negate: false,
            },
            {
                field: CriterionFieldIds.Url,
                op: CriterionOperatorIds.Wildcard,
                name: "",
                value: "https://api.example.com/api/v1/orders*",
                negate: false,
            },
        ]);
        expect(rule.action).toMatchObject({
            status: 201,
            contentType: "application/json",
            body: "{\n  \"id\": 7\n}",
        });
    });

    test("cookieOf_WhenTheCookieDomainHasALeadingDot_ShouldMatchTheBareDomain", () => {
        // Arrange
        const cookie = {
            name: "session",
            value: "abc",
            domain: ".example.com",
            path: "/",
            hostOnly: false,
            secure: true,
            httpOnly: true,
            sameSite: "lax",
            session: true,
            storeId: "0",
        } satisfies chrome.cookies.Cookie;

        // Act
        const rule = RuleFactory.cookieOf(cookie);

        // Assert
        expect(rule.type).toBe(RuleTypeIds.RequestCookie);
        expect(rule.criteria.items[0]).toMatchObject({
            field: CriterionFieldIds.Host,
            op: CriterionOperatorIds.Domains,
            value: "example.com",
        });
        expect(rule.action).toMatchObject({
            op: "addOrUpdate",
            name: "session",
            value: "abc",
        });
    });
});
