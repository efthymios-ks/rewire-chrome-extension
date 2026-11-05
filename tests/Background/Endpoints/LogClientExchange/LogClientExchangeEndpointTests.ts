import { describe, expect, test } from "vitest";
import { LogClientExchangeEndpoint } from "../../../../src/Background/Endpoints/LogClientExchange/LogClientExchangeEndpoint";
import { TimelineStore } from "../../../../src/Background/Features/Capture/TimelineStore";
import { ContentKindClassifier } from "../../../../src/Common/Content/ContentKindClassifier";
import type { LogClientExchangeCommand } from "../../../../src/Contracts/Messaging/Commands/LogClientExchangeCommand";
import { PanelCommandType } from "../../../../src/Contracts/Messaging/PanelCommandType";
import { ContentKind } from "../../../../src/Contracts/Timeline/ContentKind";
import { TimelineEntryState } from "../../../../src/Contracts/Timeline/TimelineEntryState";

const TabId = 7;

function aCommand(overrides: Partial<LogClientExchangeCommand> = {}): LogClientExchangeCommand {
    return {
        type: PanelCommandType.LogClientExchange,
        entryId: "client-1",
        tabId: TabId,
        startedAt: "2026-11-08T12:00:00.000Z",
        request: {
            method: "POST",
            url: "https://api.example.com/users/42?page=1",
            headers: [
                {
                    name: "Accept",
                    value: "application/json",
                },
                {
                    name: "Content-Type",
                    value: "application/json",
                },
            ],
            body: "{\"name\":\"Ada\"}",
        },
        response: {
            status: 201,
            statusText: "Created",
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
            ],
            body: "{\"id\":42}",
            durationInMilliseconds: 180,
        },
        error: null,
        ...overrides,
    };
}

function setUp() {
    const timelineStore = new TimelineStore();
    const endpoint = new LogClientExchangeEndpoint(timelineStore, new ContentKindClassifier());

    return {
        endpoint,
        timelineStore,
    };
}

describe("LogClientExchangeEndpoint", () => {
    test("handle_WhenResponseIsSuccessful_ShouldAddACompletedEntryToTheTimeline", async () => {
        // Arrange
        const { endpoint, timelineStore } = setUp();

        // Act
        const result = await endpoint.handle(aCommand());

        // Assert
        expect(result.hasErrors).toBe(false);
        const entries = timelineStore.list(TabId);
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            id: "client-1",
            tabId: TabId,
            method: "POST",
            url: "https://api.example.com/users/42?page=1",
            host: "api.example.com",
            path: "/users/42?page=1",
            resourceType: "Fetch",
            state: TimelineEntryState.Completed,
            statusCode: 201,
            durationInMilliseconds: 180,
            contentKind: ContentKind.Json,
            errorText: null,
        });
    });

    test("handle_WhenResponseIsAnError_ShouldAddAFailedEntry", async () => {
        // Arrange
        const { endpoint, timelineStore } = setUp();

        // Act
        await endpoint.handle(aCommand({
            response: null,
            error: "network down",
        }));

        // Assert
        const entries = timelineStore.list(TabId);
        expect(entries[0]).toMatchObject({
            state: TimelineEntryState.Failed,
            statusCode: null,
            durationInMilliseconds: null,
            errorText: "network down",
        });
    });

    test("handle_WhenBodyIsEmpty_ShouldStoreNullBody", async () => {
        // Arrange
        const { endpoint, timelineStore } = setUp();

        // Act
        await endpoint.handle(aCommand({
            request: {
                method: "GET",
                url: "https://api.example.com/users",
                headers: [],
                body: "",
            },
        }));

        // Assert
        const record = timelineStore.records(TabId)[0];
        expect(record?.requestBody).toBeNull();
    });

    test("handle_WhenRequestHasNoJsonHeaders_ShouldClassifyAsOther", async () => {
        // Arrange
        const { endpoint, timelineStore } = setUp();

        // Act
        await endpoint.handle(aCommand({
            request: {
                method: "GET",
                url: "https://example.com/page",
                headers: [],
                body: "",
            },
            response: {
                status: 200,
                statusText: "OK",
                headers: [
                    {
                        name: "Content-Type",
                        value: "text/plain",
                    },
                ],
                body: "hello",
                durationInMilliseconds: 10,
            },
        }));

        // Assert
        expect(timelineStore.list(TabId)[0]?.contentKind).toBe(ContentKind.Other);
    });
});
