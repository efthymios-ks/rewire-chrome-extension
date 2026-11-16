import { describe, expect, test } from 'vitest';
import { GetEntryDetailEndpoint } from './GetEntryDetailEndpoint';
import { DefaultTimelineStore } from '../../Features/Capture/DefaultTimelineStore';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { aSummary } from '../../../TestData';
import { aTimelineRecord } from '../../BackgroundTestData';

const TAB_ID = 7;

describe('GetEntryDetailEndpoint', () => {
    test('handleAsync_WhenTheEntryIsInTheTimeline_ShouldReturnItsDetail', async () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aTimelineRecord());
        const endpoint = new GetEntryDetailEndpoint(store);

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.GetEntryDetail,
            tabId: TAB_ID,
            entryId: 'request-1',
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: {
                summary: aSummary(),
                requestHeaders: [
                    {
                        name: 'Accept',
                        value: 'application/json',
                    },
                ],
                requestBody: null,
                requestBodyNote: null,
                requestBodyBase64: null,
                requestBodyByteSize: null,
                responseHeaders: [],
                responseBody: '{"name":"Ada"}',
                responseBodyNote: null,
                changes: [],
            },
        });
    });

    test('handleAsync_WhenTheEntryIsNoLongerInTheTimeline_ShouldFail', async () => {
        // Arrange
        const endpoint = new GetEntryDetailEndpoint(new DefaultTimelineStore());

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.GetEntryDetail,
            tabId: TAB_ID,
            entryId: 'request-1',
        });

        // Assert
        expect(result).toEqual({
            hasErrors: true,
            error: 'The request is no longer in the timeline.',
        });
    });
});
