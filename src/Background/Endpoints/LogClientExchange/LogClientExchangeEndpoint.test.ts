import { describe, expect, test } from 'vitest';
import { LogClientExchangeEndpoint } from './LogClientExchangeEndpoint';
import { DefaultTimelineStore } from '../../Features/Capture/DefaultTimelineStore';
import { DefaultContentKindClassifier } from '../../../Common/Content/DefaultContentKindClassifier';
import type { LogClientExchangeCommand } from '../../../Contracts/Messaging/Commands/LogClientExchangeCommand';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { CONTENT_KIND } from '../../../Contracts/Timeline/ContentKind';
import { TIMELINE_ENTRY_STATE } from '../../../Contracts/Timeline/TimelineEntryState';

const TAB_ID = 7;

function aCommand(overrides: Partial<LogClientExchangeCommand> = {}): LogClientExchangeCommand {
    return {
        type: PANEL_COMMAND_TYPE.LogClientExchange,
        entryId: 'client-1',
        tabId: TAB_ID,
        startedAt: '2026-11-08T12:00:00.000Z',
        request: {
            method: 'POST',
            url: 'https://api.example.com/users/42?page=1',
            headers: [
                {
                    name: 'Accept',
                    value: 'application/json',
                },
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
            body: '{"name":"Ada"}',
        },
        response: {
            status: 201,
            statusText: 'Created',
            headers: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
            body: '{"id":42}',
            durationInMilliseconds: 180,
        },
        error: null,
        ...overrides,
    };
}

function setUp() {
    const timelineStore = new DefaultTimelineStore();
    const endpoint = new LogClientExchangeEndpoint(
        /* timelineStore: */ timelineStore,
        /* classifier: */ new DefaultContentKindClassifier(),
    );

    return {
        endpoint,
        timelineStore,
    };
}

describe('LogClientExchangeEndpoint', () => {
    test('handleAsync_WhenResponseIsSuccessful_ShouldAddACompletedEntryToTheTimeline', async () => {
        // Arrange
        const { endpoint, timelineStore } = setUp();

        // Act
        const result = await endpoint.handleAsync(aCommand());

        // Assert
        expect(result.hasErrors).toBe(false);
        const entries = timelineStore.list(TAB_ID);
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            id: 'client-1',
            tabId: TAB_ID,
            method: 'POST',
            url: 'https://api.example.com/users/42?page=1',
            host: 'api.example.com',
            path: '/users/42?page=1',
            resourceType: 'Fetch',
            state: TIMELINE_ENTRY_STATE.Completed,
            statusCode: 201,
            durationInMilliseconds: 180,
            contentKind: CONTENT_KIND.Json,
            errorText: null,
        });
    });

    test('handleAsync_WhenResponseIsAnError_ShouldAddAFailedEntry', async () => {
        // Arrange
        const { endpoint, timelineStore } = setUp();

        // Act
        await endpoint.handleAsync(aCommand({
            response: null,
            error: 'network down',
        }));

        // Assert
        const entries = timelineStore.list(TAB_ID);
        expect(entries[0]).toMatchObject({
            state: TIMELINE_ENTRY_STATE.Failed,
            statusCode: null,
            durationInMilliseconds: null,
            errorText: 'network down',
        });
    });

    test('handleAsync_WhenBodyIsEmpty_ShouldStoreNullBody', async () => {
        // Arrange
        const { endpoint, timelineStore } = setUp();

        // Act
        await endpoint.handleAsync(aCommand({
            request: {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: [],
                body: '',
            },
        }));

        // Assert
        const record = timelineStore.records(TAB_ID)[0];
        expect(record?.requestBody).toBeNull();
        expect(record?.requestBodyByteSize).toBeNull();
    });

    test('handleAsync_WhenTheBodyHasText_ShouldCountItsUtf8BytesAsTheSentSize', async () => {
        // Arrange
        const { endpoint, timelineStore } = setUp();

        // Act
        await endpoint.handleAsync(aCommand({
            request: {
                method: 'POST',
                url: 'https://api.example.com/users',
                headers: [],
                body: '{"name":"Zoë"}',
            },
        }));

        // Assert
        expect(timelineStore.records(TAB_ID)[0]?.requestBodyByteSize).toBe(15);
    });

    test('handleAsync_WhenRequestHasNoJsonHeaders_ShouldClassifyAsOther', async () => {
        // Arrange
        const { endpoint, timelineStore } = setUp();

        // Act
        await endpoint.handleAsync(aCommand({
            request: {
                method: 'GET',
                url: 'https://example.com/page',
                headers: [],
                body: '',
            },
            response: {
                status: 200,
                statusText: 'OK',
                headers: [
                    {
                        name: 'Content-Type',
                        value: 'text/plain',
                    },
                ],
                body: 'hello',
                durationInMilliseconds: 10,
            },
        }));

        // Assert
        expect(timelineStore.list(TAB_ID)[0]?.contentKind).toBe(CONTENT_KIND.Other);
    });
});
