import { describe, expect, test } from "vitest";
import { ContentKindClassifier } from "../../../src/Common/Content/ContentKindClassifier";
import { HarReader, HarTabId } from "../../../src/Common/Har/HarReader";
import { ContentKind } from "../../../src/Contracts/Timeline/ContentKind";
import { TimelineEntryState } from "../../../src/Contracts/Timeline/TimelineEntryState";

const classifier = new ContentKindClassifier();

function harOf(entries: unknown[]): string {
    return JSON.stringify({
        log: {
            version: "1.2",
            entries,
        },
    });
}

function anEntry(changes: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        startedDateTime: "2026-11-12T10:00:00.000Z",
        time: 120.4,
        _resourceType: "fetch",
        request: {
            method: "post",
            url: "https://api.example.com/api/v1/orders?page=2",
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
            ],
            postData: {
                mimeType: "application/json",
                text: "{\"sku\":\"CAP\"}",
            },
        },
        response: {
            status: 201,
            statusText: "Created",
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json; charset=utf-8",
                },
            ],
            content: {
                size: 9,
                mimeType: "application/json; charset=utf-8",
                text: "{\"id\":7}",
            },
        },
        ...changes,
    };
}

describe("HarReader", () => {
    test("read_WhenAnEntryIsComplete_ShouldMapItToACallDetail", () => {
        // Arrange
        const text = harOf([anEntry()]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const detail = read.hasErrors ? undefined : read.value[0];
        expect(detail?.summary).toEqual({
            id: "har-1",
            tabId: HarTabId,
            method: "POST",
            url: "https://api.example.com/api/v1/orders?page=2",
            host: "api.example.com",
            path: "/api/v1/orders?page=2",
            endpointKey: "POST https://api.example.com/api/v1/orders",
            resourceType: "Fetch",
            contentKind: ContentKind.Json,
            state: TimelineEntryState.Completed,
            statusCode: 201,
            statusText: "Created",
            mimeType: "application/json",
            startedAt: "2026-11-12T10:00:00.000Z",
            durationInMilliseconds: 120,
            appliedRules: [],
            isAnsweredByRule: false,
            redirectedFromUrl: null,
            errorText: null,
            frame: null,
        });
        expect(detail?.requestBody).toBe("{\"sku\":\"CAP\"}");
        expect(detail?.responseBody).toBe("{\"id\":7}");
        expect(detail?.requestHeaders).toEqual([
            {
                name: "Content-Type",
                value: "application/json",
            },
        ]);
    });

    test("read_WhenATextBodyIsBase64_ShouldDecodeIt", () => {
        // Arrange
        const text = harOf([
            anEntry({
                response: {
                    status: 200,
                    content: {
                        mimeType: "application/json",
                        encoding: "base64",
                        text: btoa("{\"ok\":true}"),
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        expect(read.hasErrors ? null : read.value[0]?.responseBody).toBe("{\"ok\":true}");
    });

    test("read_WhenABinaryBodyIsBase64_ShouldSayItIsNotShown", () => {
        // Arrange
        const text = harOf([
            anEntry({
                response: {
                    status: 200,
                    content: {
                        size: 2048,
                        mimeType: "image/png",
                        encoding: "base64",
                        text: "iVBORw0KGgo=",
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const detail = read.hasErrors ? undefined : read.value[0];
        expect(detail?.responseBody).toBeNull();
        expect(detail?.responseBodyNote).toBe("Binary body (2048 bytes), not shown.");
    });

    test("read_WhenACallFailed_ShouldMarkItFailedWithItsError", () => {
        // Arrange
        const text = harOf([
            anEntry({
                time: -1,
                _error: "net::ERR_CONNECTION_REFUSED",
                response: {
                    status: 0,
                    content: {
                        comment: "No body.",
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        const summary = read.hasErrors ? undefined : read.value[0]?.summary;
        expect(summary?.state).toBe(TimelineEntryState.Failed);
        expect(summary?.statusCode).toBeNull();
        expect(summary?.errorText).toBe("net::ERR_CONNECTION_REFUSED");
        expect(summary?.durationInMilliseconds).toBeNull();
    });

    test("read_WhenAFormIsGivenAsParams_ShouldEncodeThemAsTheRequestBody", () => {
        // Arrange
        const text = harOf([
            anEntry({
                request: {
                    method: "POST",
                    url: "https://api.example.com/token",
                    postData: {
                        mimeType: "application/x-www-form-urlencoded",
                        params: [
                            {
                                name: "grant_type",
                                value: "client_credentials",
                            },
                            {
                                name: "scope",
                                value: "api://x/.default",
                            },
                        ],
                    },
                },
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        expect(read.hasErrors ? null : read.value[0]?.requestBody).toBe("grant_type=client_credentials&scope=api%3A%2F%2Fx%2F.default");
    });

    test("read_WhenEntriesAreOutOfOrder_ShouldSortThemOldestFirstAndSkipBadUrls", () => {
        // Arrange
        const text = harOf([
            anEntry({
                startedDateTime: "2026-11-12T10:00:05.000Z",
                _resourceType: "xhr",
            }),
            anEntry({
                request: {
                    url: "not a url",
                },
            }),
            anEntry({
                startedDateTime: "2026-11-12T10:00:01.000Z",
                _resourceType: "",
            }),
        ]);

        // Act
        const read = HarReader.read(text, classifier);

        // Assert
        expect(read.hasErrors ? [] : read.value.map(detail => `${detail.summary.id}:${detail.summary.resourceType}`)).toEqual([
            "har-3:Other",
            "har-1:XHR",
        ]);
    });

    test.each([
        [
            "not json",
            "it isn't valid JSON",
        ],
        [
            "{\"log\":{}}",
            "it has no log.entries list",
        ],
        [
            "[]",
            "it has no log.entries list",
        ],
    ])("read_WhenTheTextIs(%s)_ShouldSayWhy", (text, expected) => {
        // Arrange
        const file = text;

        // Act
        const read = HarReader.read(file, classifier);

        // Assert
        expect(read).toEqual({
            hasErrors: true,
            error: expected,
        });
    });
});
