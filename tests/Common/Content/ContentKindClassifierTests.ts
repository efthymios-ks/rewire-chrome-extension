import { describe, expect, test } from "vitest";
import { ContentKindClassifier } from "../../../src/Common/Content/ContentKindClassifier";
import type { ContentSignals } from "../../../src/Common/Content/ContentSignals";
import { ContentKind } from "../../../src/Contracts/Timeline/ContentKind";

const classifier = new ContentKindClassifier();

function signals(overrides: Partial<ContentSignals>): ContentSignals {
    return {
        url: "https://api.example.com/api/items",
        requestContentType: "",
        responseMimeType: "",
        requestBody: null,
        ...overrides,
    };
}

describe("ContentKindClassifier", () => {
    test.each([
        [
            "GraphQL path",
            signals({
                url: "https://api.example.com/graphql",
                responseMimeType: "application/json",
            }),
            ContentKind.GraphQl,
        ],
        [
            "GraphQL body",
            signals({
                requestContentType: "application/json",
                requestBody: "{\"query\":\"{ me { id } }\"}",
            }),
            ContentKind.GraphQl,
        ],
        [
            "batched GraphQL body",
            signals({
                requestBody: "[{\"query\":\"{ a }\"},{\"query\":\"{ b }\"}]",
            }),
            ContentKind.GraphQl,
        ],
        [
            "GraphQL content type",
            signals({
                requestContentType: "application/graphql",
            }),
            ContentKind.GraphQl,
        ],
        [
            "multipart form",
            signals({
                requestContentType: "multipart/form-data; boundary=x",
                responseMimeType: "application/json",
            }),
            ContentKind.FormData,
        ],
        [
            "urlencoded form",
            signals({
                requestContentType: "application/x-www-form-urlencoded",
            }),
            ContentKind.FormData,
        ],
        [
            "JSON response",
            signals({
                responseMimeType: "application/problem+json",
            }),
            ContentKind.Json,
        ],
        [
            "plain text",
            signals({
                responseMimeType: "text/plain",
            }),
            ContentKind.Other,
        ],
    ])("classify_WhenRequestIs(%s)_ShouldReturnExpectedKind", (
        _name,
        input,
        expected
    ) => {
        // Arrange
        const requestSignals = input;

        // Act
        const kind = classifier.classify(requestSignals);

        // Assert
        expect(kind).toBe(expected);
    });

    test("classify_WhenJsonBodyHasNoQueryField_ShouldReturnJson", () => {
        // Arrange
        const requestSignals = signals({
            requestContentType: "application/json",
            requestBody: "{\"name\":\"Ada\"}",
        });

        // Act
        const kind = classifier.classify(requestSignals);

        // Assert
        expect(kind).toBe(ContentKind.Json);
    });
});
