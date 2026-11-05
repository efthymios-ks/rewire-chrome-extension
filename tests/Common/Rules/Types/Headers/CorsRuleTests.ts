import { describe, expect, test } from "vitest";
import { Result } from "../../../../../src/Common/Results/Result";
import type { DnrCondition } from "../../../../../src/Common/Rules/Criteria/DnrFragment";
import { CorsRule } from "../../../../../src/Common/Rules/Types/Headers/CorsRule";
import type { HeaderEntry } from "../../../../../src/Contracts/Timeline/HeaderEntry";
import { aRequestDraft, aResponseDraft, aRuleContext } from "../../../../TestData";

const ruleType = new CorsRule();
const condition: DnrCondition = {
    urlFilter: "||api.example.com",
};
const preflightHeaders: HeaderEntry[] = [
    {
        name: "Origin",
        value: "http://localhost:3000",
    },
    {
        name: "Access-Control-Request-Method",
        value: "PUT",
    },
    {
        name: "Access-Control-Request-Headers",
        value: "X-Token",
    },
];

describe("CorsRule", () => {
    test("applyRequest_WhenPreflightAndPolicyIsEmpty_ShouldAnswer204EchoingTheRequest", () => {
        // Arrange
        const request = aRequestDraft({
            method: "OPTIONS",
            headers: preflightHeaders,
        });
        const action = {
            allowedOrigin: "",
            allowedMethods: "",
            allowedHeaders: "",
            answerPreflight: true,
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.response).toEqual({
            status: 204,
            headers: [
                {
                    name: "Access-Control-Allow-Origin",
                    value: "http://localhost:3000",
                },
                {
                    name: "Access-Control-Allow-Credentials",
                    value: "true",
                },
                {
                    name: "Access-Control-Allow-Methods",
                    value: "PUT",
                },
                {
                    name: "Access-Control-Allow-Headers",
                    value: "X-Token",
                },
                {
                    name: "Access-Control-Max-Age",
                    value: "600",
                },
                {
                    name: "Vary",
                    value: "Origin",
                },
            ],
            body: "",
        });
    });

    test("applyRequest_WhenPreflightAndPolicyIsSet_ShouldAnswerWithThePolicy", () => {
        // Arrange
        const request = aRequestDraft({
            method: "options",
            headers: preflightHeaders,
        });
        const action = {
            allowedOrigin: "https://app.example.com",
            allowedMethods: "GET, POST",
            allowedHeaders: "Authorization",
            answerPreflight: true,
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.response?.headers).toEqual([
            {
                name: "Access-Control-Allow-Origin",
                value: "https://app.example.com",
            },
            {
                name: "Access-Control-Allow-Credentials",
                value: "true",
            },
            {
                name: "Access-Control-Allow-Methods",
                value: "GET, POST",
            },
            {
                name: "Access-Control-Allow-Headers",
                value: "Authorization",
            },
            {
                name: "Access-Control-Max-Age",
                value: "600",
            },
            {
                name: "Vary",
                value: "Origin",
            },
        ]);
    });

    test("applyRequest_WhenAnswerPreflightIsOff_ShouldLetThePreflightThrough", () => {
        // Arrange
        const request = aRequestDraft({
            method: "OPTIONS",
            headers: preflightHeaders,
        });
        const action = {
            allowedOrigin: "",
            allowedMethods: "",
            allowedHeaders: "",
            answerPreflight: false,
        };

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.response).toBeNull();
    });

    test("applyRequest_WhenOptionsHasNoRequestMethod_ShouldLetItThrough", () => {
        // Arrange
        const request = aRequestDraft({
            method: "OPTIONS",
            headers: [
                {
                    name: "Origin",
                    value: "http://localhost:3000",
                },
            ],
        });
        const action = ruleType.defaultAction();

        // Act
        const draft = ruleType.applyRequest(
            request,
            action,
            aRuleContext()
        );

        // Assert
        expect(draft.response).toBeNull();
    });

    test("applyResponse_WhenOriginIsEmpty_ShouldAllowAnyOriginWithoutCredentials", () => {
        // Arrange
        const action = {
            allowedOrigin: " ",
            allowedMethods: "GET",
            allowedHeaders: "",
            answerPreflight: true,
        };

        // Act
        const draft = ruleType.applyResponse(
            aResponseDraft(),
            action,
            aRuleContext(),
            aRequestDraft()
        );

        // Assert
        expect(draft.headers).toEqual([
            {
                name: "Content-Type",
                value: "application/json",
            },
            {
                name: "Access-Control-Allow-Origin",
                value: "*",
            },
            {
                name: "Access-Control-Allow-Methods",
                value: "GET",
            },
            {
                name: "Access-Control-Allow-Headers",
                value: "Authorization, Content-Type, X-Requested-With",
            },
            {
                name: "Access-Control-Expose-Headers",
                value: "*",
            },
        ]);
    });

    test("applyResponse_WhenOriginIsSpecific_ShouldReplaceTheServerOriginAndAllowCredentials", () => {
        // Arrange
        const response = aResponseDraft({
            headers: [
                {
                    name: "access-control-allow-origin",
                    value: "https://other.example.com",
                },
            ],
        });
        const action = {
            allowedOrigin: "https://app.example.com",
            allowedMethods: "GET",
            allowedHeaders: "Authorization",
            answerPreflight: true,
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
                name: "Access-Control-Allow-Origin",
                value: "https://app.example.com",
            },
            {
                name: "Access-Control-Allow-Methods",
                value: "GET",
            },
            {
                name: "Access-Control-Allow-Headers",
                value: "Authorization",
            },
            {
                name: "Access-Control-Expose-Headers",
                value: "*",
            },
            {
                name: "Access-Control-Allow-Credentials",
                value: "true",
            },
        ]);
    });

    test("toDnr_WhenCalled_ShouldSetTheResponseHeadersInTheBrowser", () => {
        // Arrange
        const action = {
            allowedOrigin: "",
            allowedMethods: "GET",
            allowedHeaders: "Authorization",
            answerPreflight: true,
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
                            header: "Access-Control-Allow-Origin",
                            operation: "set",
                            value: "*",
                        },
                        {
                            header: "Access-Control-Allow-Methods",
                            operation: "set",
                            value: "GET",
                        },
                        {
                            header: "Access-Control-Allow-Headers",
                            operation: "set",
                            value: "Authorization",
                        },
                        {
                            header: "Access-Control-Expose-Headers",
                            operation: "set",
                            value: "*",
                        },
                    ],
                },
                condition,
            },
        ]));
    });

    test("summary_WhenPreflightsAreAnswered_ShouldSayItAndFallBackToAnyOrigin", () => {
        // Arrange
        const action = ruleType.defaultAction();

        // Act
        const summary = ruleType.summary(action);

        // Assert
        expect(summary).toBe("Allow *, answer preflights");
    });
});
