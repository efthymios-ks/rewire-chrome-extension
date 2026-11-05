import { describe, expect, test } from "vitest";
import { Result } from "../../../../../src/Common/Results/Result";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { SecurityHeadersRule } from "../../../../../src/Common/Rules/Types/Headers/SecurityHeadersRule";
import { aRequestDraft, aResponseDraft, aRuleContext } from "../../../../TestData";

const ruleType = new SecurityHeadersRule();
const condition: DnrCondition = {
    urlFilter: "||api.example.com",
};

describe("SecurityHeadersRule", () => {
    test.each([
        [
            "hsts",
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        ],
        [
            "csp",
            "Content-Security-Policy",
            "default-src 'self'",
        ],
        [
            "permissionsPolicy",
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        ],
        [
            "contentTypeOptions",
            "X-Content-Type-Options",
            "nosniff",
        ],
        [
            "frameOptions",
            "X-Frame-Options",
            "DENY",
        ],
        [
            "referrerPolicy",
            "Referrer-Policy",
            "strict-origin-when-cross-origin",
        ],
    ])("applyResponse_WhenPresetIs(%s)_ShouldSetItsHeaderAndValue", (
        preset,
        header,
        value
    ) => {
        // Arrange
        const action = {
            preset,
            value: "",
        };

        // Act
        const draft = ruleType.applyResponse(
            aResponseDraft(),
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toContainEqual({
            name: header,
            value,
        });
    });

    test("applyResponse_WhenValueIsSet_ShouldOverrideThePresetAndReplaceTheServerHeader", () => {
        // Arrange
        const response = aResponseDraft({
            headers: [
                {
                    name: "x-frame-options",
                    value: "ALLOWALL",
                },
            ],
        });
        const action = {
            preset: "frameOptions",
            value: "SAMEORIGIN",
        };

        // Act
        const draft = ruleType.applyResponse(
            response,
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "X-Frame-Options",
                value: "SAMEORIGIN",
            },
        ]);
    });

    test("summary_WhenPresetIsUnknown_ShouldFallBackToHsts", () => {
        // Arrange
        const action = {
            preset: "unknown",
            value: "",
        };

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe("Strict-Transport-Security: max-age=31536000; includeSubDomains");
    });

    test("toDnr_WhenPresetIsSet_ShouldSetTheResponseHeaderInTheBrowser", () => {
        // Arrange
        const action = {
            preset: "contentTypeOptions",
            value: "",
        };

        // Act
        const result = ruleType.toDnr(
            action,
            condition,
            aRuleContext()
        );

        // Assert
        expect(result).toEqual(Result.ok([
            {
                action: {
                    type: "modifyHeaders",
                    responseHeaders: [
                        {
                            header: "X-Content-Type-Options",
                            operation: "set",
                            value: "nosniff",
                        },
                    ],
                },
                condition,
            },
        ]));
    });
});
