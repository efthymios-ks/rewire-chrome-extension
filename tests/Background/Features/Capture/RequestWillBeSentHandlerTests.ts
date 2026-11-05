import { describe, expect, test, vi } from "vitest";
import { RequestWillBeSentHandler } from "../../../../src/Background/Features/Capture/RequestWillBeSentHandler";
import { aRequestWillBeSentEvent, createDebuggerClientMock, createLogger } from "../../BackgroundTestData";
import { type CaptureParts, captureParts, DocumentUrl } from "./DocumentCaptureTestData";

const TabId = 7;

function handlerOf(parts: CaptureParts): RequestWillBeSentHandler {
    return new RequestWillBeSentHandler({
        timelineStore: parts.timelineStore,
        pendingDocuments: parts.pendingDocuments,
        admission: parts.admission,
        captureFilter: parts.captureFilter,
        recordFactory: parts.recordFactory,
        recordClassifier: parts.recordClassifier,
        browserRuleSimulator: parts.browserRuleSimulator,
        debuggerClient: createDebuggerClientMock().client,
        logger: createLogger(),
    });
}

describe("RequestWillBeSentHandler", () => {
    test("handle_WhenAFetchIsSent_ShouldAddItToTheTimeline", async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);

        // Act
        await handler.handle(TabId, aRequestWillBeSentEvent());

        // Assert
        expect(parts.timelineStore.list(TabId)).toHaveLength(1);
    });

    test("handle_WhenADocumentIsRequested_ShouldHoldItUntilTheResponse", async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);

        // Act
        await handler.handle(TabId, aRequestWillBeSentEvent({
            type: "Document",
            request: {
                url: DocumentUrl,
                method: "GET",
                headers: {},
                initialPriority: "VeryHigh",
                referrerPolicy: "strict-origin-when-cross-origin",
            },
        }));

        // Assert
        expect(parts.timelineStore.list(TabId)).toHaveLength(0);
        expect(parts.pendingDocuments.has(TabId, "request-1")).toBe(true);
    });

    test("handle_WhenAHeldDocumentRedirects_ShouldFollowTheNewUrl", async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);
        const request = {
            method: "GET",
            headers: {},
            initialPriority: "VeryHigh",
            referrerPolicy: "strict-origin-when-cross-origin",
        } as const;
        await handler.handle(TabId, aRequestWillBeSentEvent({
            type: "Document",
            request: {
                ...request,
                url: "http://jsonplaceholder.typicode.com/posts",
            },
        }));

        // Act
        await handler.handle(TabId, aRequestWillBeSentEvent({
            type: "Document",
            request: {
                ...request,
                url: DocumentUrl,
            },
            redirectResponse: {
                url: "http://jsonplaceholder.typicode.com/posts",
                status: 307,
                statusText: "Temporary Redirect",
                headers: {},
                mimeType: "",
                charset: "",
                connectionReused: false,
                connectionId: 1,
                encodedDataLength: 0,
                securityState: "insecure",
            },
        }));

        // Assert
        const held = parts.pendingDocuments.take(TabId, "request-1");
        expect(held?.summary.url).toBe(DocumentUrl);
        expect(held?.summary.redirectedFromUrl).toBe("http://jsonplaceholder.typicode.com/posts");
    });

    test("handle_WhenAnImageIsRequested_ShouldSkipIt", async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);

        // Act
        await handler.handle(TabId, aRequestWillBeSentEvent({
            type: "Image",
        }));

        // Assert
        expect(parts.timelineStore.list(TabId)).toHaveLength(0);
        expect(parts.pendingDocuments.has(TabId, "request-1")).toBe(false);
    });

    test("handle_WhenAnAdmittedRequestRedirects_ShouldSplitIntoTwoRows", async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);
        await handler.handle(TabId, aRequestWillBeSentEvent({
            request: {
                url: "https://jsonplaceholder.typicode.com/posts",
                method: "GET",
                headers: {},
                initialPriority: "High",
                referrerPolicy: "strict-origin-when-cross-origin",
            },
        }));

        // Act
        await handler.handle(TabId, aRequestWillBeSentEvent({
            request: {
                url: "https://jsonplaceholder.typicode.com/users",
                method: "GET",
                headers: {},
                initialPriority: "High",
                referrerPolicy: "strict-origin-when-cross-origin",
            },
            redirectResponse: {
                url: "https://jsonplaceholder.typicode.com/posts",
                status: 308,
                statusText: "Permanent Redirect",
                headers: {
                    location: "https://jsonplaceholder.typicode.com/users",
                },
                mimeType: "",
                charset: "",
                connectionReused: false,
                connectionId: 1,
                encodedDataLength: 0,
                securityState: "secure",
            },
        }));

        // Assert
        const entries = parts.timelineStore.list(TabId);
        expect(entries).toHaveLength(2);
        const leg = entries.find(entry => entry.id === "request-1-leg-1");
        const live = entries.find(entry => entry.id === "request-1");
        expect(leg?.url).toBe("https://jsonplaceholder.typicode.com/posts");
        expect(leg?.statusCode).toBe(308);
        expect(live?.url).toBe("https://jsonplaceholder.typicode.com/users");
        expect(live?.redirectedFromUrl).toBe("https://jsonplaceholder.typicode.com/posts");
        expect(live?.statusCode).toBeNull();
    });

    test("handle_WhenAPendingDocumentIsRewrittenByADnrRule_ShouldSnapshotTheLeg", async () => {
        // Arrange
        const parts = captureParts();
        parts.browserRuleSimulator.onRequest = vi.fn().mockReturnValue({
            appliedRules: [
                {
                    ruleId: "rewrite-1",
                    ruleName: "Rewrite",
                    engine: 1,
                    note: "Rewrite",
                },
            ],
            changes: [],
            isAnsweredByRule: false,
        });
        const handler = handlerOf(parts);
        await handler.handle(TabId, aRequestWillBeSentEvent({
            type: "Document",
            request: {
                url: "https://jsonplaceholder.typicode.com/posts",
                method: "GET",
                headers: {},
                initialPriority: "VeryHigh",
                referrerPolicy: "strict-origin-when-cross-origin",
            },
        }));

        // Act
        await handler.handle(TabId, aRequestWillBeSentEvent({
            type: "Document",
            request: {
                url: "https://jsonplaceholder.typicode.com/users",
                method: "GET",
                headers: {},
                initialPriority: "VeryHigh",
                referrerPolicy: "strict-origin-when-cross-origin",
            },
            redirectResponse: {
                url: "https://jsonplaceholder.typicode.com/posts",
                status: 307,
                statusText: "Internal Redirect",
                headers: {},
                mimeType: "",
                charset: "",
                connectionReused: false,
                connectionId: 1,
                encodedDataLength: 0,
                securityState: "secure",
            },
        }));

        // Assert
        const leg = parts.timelineStore.get(TabId, "request-1-leg-1");
        expect(leg?.summary.url).toBe("https://jsonplaceholder.typicode.com/posts");
        expect(leg?.summary.statusCode).toBe(307);
        expect(leg?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(["rewrite-1"]);
        const pending = parts.pendingDocuments.get(TabId, "request-1");
        expect(pending?.summary.url).toBe("https://jsonplaceholder.typicode.com/users");
        expect(pending?.summary.redirectedFromUrl).toBe("https://jsonplaceholder.typicode.com/posts");
    });

    test("handle_WhenAPendingDocumentHasNoRuleActivity_ShouldSkipTheLeg", async () => {
        // Arrange
        const parts = captureParts();
        const handler = handlerOf(parts);
        await handler.handle(TabId, aRequestWillBeSentEvent({
            type: "Document",
            request: {
                url: "https://example.com/login",
                method: "GET",
                headers: {},
                initialPriority: "VeryHigh",
                referrerPolicy: "strict-origin-when-cross-origin",
            },
        }));

        // Act
        await handler.handle(TabId, aRequestWillBeSentEvent({
            type: "Document",
            request: {
                url: "https://example.com/dashboard",
                method: "GET",
                headers: {},
                initialPriority: "VeryHigh",
                referrerPolicy: "strict-origin-when-cross-origin",
            },
            redirectResponse: {
                url: "https://example.com/login",
                status: 302,
                statusText: "Found",
                headers: {},
                mimeType: "",
                charset: "",
                connectionReused: false,
                connectionId: 1,
                encodedDataLength: 0,
                securityState: "secure",
            },
        }));

        // Assert
        expect(parts.timelineStore.list(TabId)).toHaveLength(0);
        expect(parts.pendingDocuments.get(TabId, "request-1")?.summary.url).toBe("https://example.com/dashboard");
    });

    test("handle_WhenRedirectFires_ShouldReSimulateBrowserRulesAndAttachToTheLeg", async () => {
        // Arrange
        const parts = captureParts();
        parts.browserRuleSimulator.onRequest = vi.fn().mockReturnValue({
            appliedRules: [
                {
                    ruleId: "rewrite-1",
                    ruleName: "Rewrite",
                    engine: 1,
                    note: "Rewrite",
                },
            ],
            changes: [],
            isAnsweredByRule: false,
        });
        const handler = handlerOf(parts);
        await handler.handle(TabId, aRequestWillBeSentEvent({
            request: {
                url: "https://jsonplaceholder.typicode.com/posts",
                method: "GET",
                headers: {},
                initialPriority: "High",
                referrerPolicy: "strict-origin-when-cross-origin",
            },
        }));

        // Act
        await handler.handle(TabId, aRequestWillBeSentEvent({
            request: {
                url: "https://jsonplaceholder.typicode.com/users",
                method: "GET",
                headers: {},
                initialPriority: "High",
                referrerPolicy: "strict-origin-when-cross-origin",
            },
            redirectResponse: {
                url: "https://jsonplaceholder.typicode.com/posts",
                status: 307,
                statusText: "Internal Redirect",
                headers: {},
                mimeType: "",
                charset: "",
                connectionReused: false,
                connectionId: 1,
                encodedDataLength: 0,
                securityState: "secure",
            },
        }));

        // Assert
        const leg = parts.timelineStore.get(TabId, "request-1-leg-1");
        const live = parts.timelineStore.get(TabId, "request-1");
        expect(leg?.summary.appliedRules.map(rule => rule.ruleId)).toEqual(["rewrite-1"]);
        expect(live?.summary.appliedRules).toEqual([]);
    });
});
