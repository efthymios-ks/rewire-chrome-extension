import { describe, expect, test } from "vitest";
import type { RuleContext } from "../../../../src/Common/Rules/Context/RuleContext";
import { CriterionFieldRegistry } from "../../../../src/Common/Rules/Criteria/CriterionFields";
import { type DnrFragment, DnrFragmentKind } from "../../../../src/Common/Rules/Criteria/DnrFragment";
import type { MatchFacts } from "../../../../src/Common/Rules/Drafts/Drafts";
import { type Criterion, CriterionFieldIds, CriterionOperatorIds } from "../../../../src/Contracts/Rules/Criterion";
import { FixedRuleContext } from "../../../FixedRuleContext";
import { aCriterion, aRequestDraft, aResponseDraft, aRuleContext, TestUrls } from "../../../TestData";

function readOf(
    criterion: Criterion,
    facts: MatchFacts,
    context: RuleContext = aRuleContext()
): string[] {
    const field = CriterionFieldRegistry.get(criterion.field);
    if (field === undefined) {
        throw new Error(`Field "${criterion.field}" is not registered.`);
    }

    return field.read(
        facts,
        criterion,
        context
    );
}

function readFromContext(fieldId: string, context: RuleContext): string[] {
    return readOf(
        aCriterion({
            field: fieldId,
        }),
        requestFacts(TestUrls.UsersProfile),
        context
    );
}

function dnrOf(criterion: Criterion): DnrFragment {
    const field = CriterionFieldRegistry.get(criterion.field);
    if (field === undefined) {
        throw new Error(`Field "${criterion.field}" is not registered.`);
    }

    return field.toDnr(criterion);
}

function regexOf(criterion: Criterion): RegExp {
    const fragment = dnrOf(criterion);
    if (fragment.kind !== DnrFragmentKind.Regex) {
        throw new Error("The criterion did not compile to a regex.");
    }

    return new RegExp(fragment.source);
}

function requestFacts(url: string): MatchFacts {
    return {
        request: aRequestDraft({
            url,
        }),
        response: null,
    };
}

describe("CriterionFields", () => {
    test("read_WhenUrlIsParsed_ShouldReturnHostPathAndExtension", () => {
        // Arrange
        const facts = requestFacts("https://CDN.Example.com:8443/assets/App.JS?v=1");

        // Act
        const host = readOf(aCriterion({ field: CriterionFieldIds.Host }), facts);
        const path = readOf(aCriterion({ field: CriterionFieldIds.Path }), facts);
        const extension = readOf(aCriterion({ field: CriterionFieldIds.Extension }), facts);

        // Assert
        expect(host).toEqual(["cdn.example.com"]);
        expect(path).toEqual(["/assets/App.JS"]);
        expect(extension).toEqual(["js"]);
    });

    test("read_WhenUrlCannotBeParsed_ShouldReturnNoHostPathOrQuery", () => {
        // Arrange
        const facts = requestFacts("not a url");

        // Act
        const host = readOf(aCriterion({ field: CriterionFieldIds.Host }), facts);
        const path = readOf(aCriterion({ field: CriterionFieldIds.Path }), facts);
        const query = readOf(aCriterion({
            field: CriterionFieldIds.Query,
            name: "page",
        }), facts);

        // Assert
        expect(host).toEqual([]);
        expect(path).toEqual([]);
        expect(query).toEqual([]);
    });

    test("read_WhenQueryRepeatsName_ShouldReturnEveryValue", () => {
        // Arrange
        const facts = requestFacts("https://api.example.com/search?tag=a&tag=b%20c&page=2");

        // Act
        const values = readOf(aCriterion({
            field: CriterionFieldIds.Query,
            name: "tag",
        }), facts);

        // Assert
        expect(values).toEqual([
            "a",
            "b c",
        ]);
    });

    test("read_WhenRequestHasCookieHeader_ShouldReturnNamedCookie", () => {
        // Arrange
        const facts: MatchFacts = {
            request: aRequestDraft({
                headers: [
                    {
                        name: "cookie",
                        value: "session=abc; theme=dark",
                    },
                ],
            }),
            response: null,
        };

        // Act
        const values = readOf(aCriterion({
            field: CriterionFieldIds.RequestCookie,
            name: "theme",
        }), facts);

        // Assert
        expect(values).toEqual(["dark"]);
    });

    test("read_WhenResponseIsMissingOrKnown_ShouldReadStatusAndLowercaseContentType", () => {
        // Arrange
        const pending = requestFacts("https://api.example.com/users");
        const answered: MatchFacts = {
            request: aRequestDraft(),
            response: aResponseDraft({
                status: 404,
                headers: [
                    {
                        name: "content-type",
                        value: "Application/JSON",
                    },
                ],
            }),
        };

        // Act
        const pendingStatus = readOf(aCriterion({ field: CriterionFieldIds.ResponseStatus }), pending);
        const answeredStatus = readOf(aCriterion({ field: CriterionFieldIds.ResponseStatus }), answered);
        const contentType = readOf(aCriterion({ field: CriterionFieldIds.ContentType }), answered);

        // Assert
        expect(pendingStatus).toEqual([]);
        expect(answeredStatus).toEqual(["404"]);
        expect(contentType).toEqual(["application/json"]);
    });

    test("read_WhenFieldComesFromContext_ShouldUseClockAndRandom", () => {
        // Arrange
        const context = new FixedRuleContext(new Date("2026-11-06T09:05:00"), 0.25);

        // Act
        const time = readFromContext(CriterionFieldIds.TimeWindow, context);
        const sample = readFromContext(CriterionFieldIds.Sample, context);

        // Assert
        expect(time).toEqual(["09:05"]);
        expect(sample).toEqual(["25"]);
    });

    test("read_WhenFieldIsResourceType_ShouldReadXhrAsBothFetchAndXhr", () => {
        // Arrange
        const facts: MatchFacts = {
            request: aRequestDraft({
                resourceType: "XHR",
            }),
            response: null,
        };

        // Act
        const values = readOf(aCriterion({ field: CriterionFieldIds.ResourceType }), facts);

        // Assert
        expect(values).toEqual([
            "fetch",
            "xhr",
        ]);
    });

    test("toDnr_WhenUrlWildcard_ShouldReturnAnchoredRegex", () => {
        // Arrange
        const criterion = aCriterion({
            value: "https://api.example.com/*",
        });

        // Act
        const fragment = dnrOf(criterion);

        // Assert
        expect(fragment).toEqual({
            kind: DnrFragmentKind.Regex,
            source: "^https://api\\.example\\.com/.*$",
        });
    });

    test.each([
        [
            CriterionFieldIds.Url,
            CriterionOperatorIds.Wildcard,
            true,
        ],
        [
            CriterionFieldIds.Path,
            CriterionOperatorIds.Regex,
            false,
        ],
        [
            CriterionFieldIds.Query,
            CriterionOperatorIds.Regex,
            false,
        ],
        [
            CriterionFieldIds.Extension,
            CriterionOperatorIds.OneOf,
            true,
        ],
        [
            CriterionFieldIds.RequestHeader,
            CriterionOperatorIds.Wildcard,
            false,
        ],
        [
            CriterionFieldIds.RequestCookie,
            CriterionOperatorIds.Wildcard,
            false,
        ],
        [
            CriterionFieldIds.ResponseStatus,
            CriterionOperatorIds.Range,
            false,
        ],
        [
            CriterionFieldIds.Sample,
            CriterionOperatorIds.Percent,
            false,
        ],
        [
            CriterionFieldIds.TimeWindow,
            CriterionOperatorIds.Between,
            false,
        ],
    ])("toDnr_WhenFieldIs(%s)WithOperator(%s)AndNegateIs(%s)_ShouldBeUnsupported", (
        field,
        op,
        isNegated
    ) => {
        // Arrange
        const criterion = aCriterion({
            field,
            op,
            name: "x",
            value: "1",
            negate: isNegated,
        });

        // Act
        const fragment = dnrOf(criterion);

        // Assert
        expect(fragment.kind).toBe(DnrFragmentKind.Unsupported);
    });

    test("toDnr_WhenHostDomainsIsNegated_ShouldExcludeDomains", () => {
        // Arrange
        const included = aCriterion({
            field: CriterionFieldIds.Host,
            op: CriterionOperatorIds.Domains,
            value: "Example.com, .cdn.example.org",
        });
        const excluded = aCriterion({
            field: CriterionFieldIds.Host,
            op: CriterionOperatorIds.Domains,
            value: "example.com",
            negate: true,
        });

        // Act
        const includedFragment = dnrOf(included);
        const excludedFragment = dnrOf(excluded);

        // Assert
        expect(includedFragment).toEqual({
            kind: DnrFragmentKind.Condition,
            patch: {
                requestDomains: [
                    "example.com",
                    "cdn.example.org",
                ],
            },
        });
        expect(excludedFragment).toEqual({
            kind: DnrFragmentKind.Condition,
            patch: {
                excludedRequestDomains: ["example.com"],
            },
        });
    });

    test("toDnr_WhenMethodListHasUnknownAndRepeatedMethods_ShouldMapToOtherOnce", () => {
        // Arrange
        const criterion = aCriterion({
            field: CriterionFieldIds.Method,
            op: CriterionOperatorIds.OneOf,
            value: "GET, purge, get LINK",
        });

        // Act
        const fragment = dnrOf(criterion);

        // Assert
        expect(fragment).toEqual({
            kind: DnrFragmentKind.Condition,
            patch: {
                requestMethods: [
                    "get",
                    "other",
                ],
            },
        });
    });

    test("toDnr_WhenResourceTypesAreListed_ShouldMapToBrowserTypes", () => {
        // Arrange
        const criterion = aCriterion({
            field: CriterionFieldIds.ResourceType,
            op: CriterionOperatorIds.OneOf,
            value: "fetch, XHR document",
        });

        // Act
        const fragment = dnrOf(criterion);

        // Assert
        expect(fragment).toEqual({
            kind: DnrFragmentKind.Condition,
            patch: {
                resourceTypes: [
                    "xmlhttprequest",
                    "main_frame",
                    "sub_frame",
                ],
            },
        });
    });

    test("toDnr_WhenPathWildcardHasNoStar_ShouldMatchPathOnAnyHostWithQueryOnly", () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CriterionFieldIds.Path,
            op: CriterionOperatorIds.Wildcard,
            value: "/api/v1/users",
        }));

        // Act
        const withQuery = regex.test("https://api.example.com:8443/api/v1/users?page=2");
        const deeperPath = regex.test("https://api.example.com/api/v1/users/42");

        // Assert
        expect(withQuery).toBe(true);
        expect(deeperPath).toBe(false);
    });

    test("toDnr_WhenExtensionsAreListed_ShouldMatchAnyBeforeTheQuery", () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CriterionFieldIds.Extension,
            op: CriterionOperatorIds.OneOf,
            value: ".JS, css",
        }));

        // Act
        const script = regex.test("https://cdn.example.com/app.js?v=1");
        const style = regex.test("https://cdn.example.com/site.css");
        const json = regex.test("https://cdn.example.com/data.json");

        // Assert
        expect(script).toBe(true);
        expect(style).toBe(true);
        expect(json).toBe(false);
    });

    test("toDnr_WhenQueryWildcardHasNoWildcards_ShouldMatchEncodedNameAndValue", () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CriterionFieldIds.Query,
            op: CriterionOperatorIds.Wildcard,
            name: "q",
            value: "a b",
        }));

        // Act
        const exact = regex.test("https://api.example.com/search?page=1&q=a%20b");
        const longer = regex.test("https://api.example.com/search?q=a%20bc");

        // Assert
        expect(exact).toBe(true);
        expect(longer).toBe(false);
    });

    test("toDnr_WhenQueryWildcardEscapesAStar_ShouldMatchTheLiteralStar", () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CriterionFieldIds.Query,
            op: CriterionOperatorIds.Wildcard,
            name: "q",
            value: "a\\*",
        }));

        // Act
        const literal = regex.test("https://api.example.com/search?q=a*");
        const longer = regex.test("https://api.example.com/search?q=abc");

        // Assert
        expect(literal).toBe(true);
        expect(longer).toBe(false);
    });

    test("toDnr_WhenQueryWildcardHasAStar_ShouldBeUnsupported", () => {
        // Arrange
        const criterion = aCriterion({
            field: CriterionFieldIds.Query,
            op: CriterionOperatorIds.Wildcard,
            name: "q",
            value: "a*",
        });

        // Act
        const fragment = dnrOf(criterion);

        // Assert
        expect(fragment.kind).toBe(DnrFragmentKind.Unsupported);
    });

    test("toDnr_WhenHostWildcard_ShouldNotMatchHostTextInsideThePath", () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CriterionFieldIds.Host,
            op: CriterionOperatorIds.Wildcard,
            value: "*.example.com",
        }));

        // Act
        const subdomain = regex.test("https://api.example.com/users");
        const otherHost = regex.test("https://other.test/x.example.com/users");

        // Assert
        expect(subdomain).toBe(true);
        expect(otherHost).toBe(false);
    });

    test("toDnr_WhenPathWildcard_ShouldNotMatchAcrossTheQuery", () => {
        // Arrange
        const regex = regexOf(aCriterion({
            field: CriterionFieldIds.Path,
            op: CriterionOperatorIds.Wildcard,
            value: "/api/*/profile",
        }));

        // Act
        const inPath = regex.test("https://api.example.com/api/42/profile");
        const inQuery = regex.test("https://api.example.com/api/42?next=/profile");

        // Assert
        expect(inPath).toBe(true);
        expect(inQuery).toBe(false);
    });
});
