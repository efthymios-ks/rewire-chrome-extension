import { describe, expect, test } from 'vitest';
import { GetTimelineDetailsEndpoint } from './GetTimelineDetailsEndpoint';
import { DefaultTimelineStore } from '../../Features/Capture/DefaultTimelineStore';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { aSummary } from '../../../TestData';
import { aTimelineRecord } from '../../BackgroundTestData';

const TAB_ID = 7;

describe('GetTimelineDetailsEndpoint', () => {
    test('handleAsync_WhenTheTabHasCalls_ShouldReturnEveryDetail', async () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aTimelineRecord());
        store.add(aTimelineRecord({
            summary: aSummary({
                id: 'request-2',
            }),
        }));
        const endpoint = new GetTimelineDetailsEndpoint(store);

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.GetTimelineDetails,
            tabId: TAB_ID,
        });

        // Assert
        const bodies = result.hasErrors
            ? []
            : result.value.map(detail => `${detail.summary.id}:${detail.responseBody}`);
        expect(bodies).toEqual([
            'request-1:{"name":"Ada"}',
            'request-2:{"name":"Ada"}',
        ]);
    });

    test('handleAsync_WhenTheTabHasNoCalls_ShouldReturnAnEmptyList', async () => {
        // Arrange
        const endpoint = new GetTimelineDetailsEndpoint(new DefaultTimelineStore());

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.GetTimelineDetails,
            tabId: TAB_ID,
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });
});
