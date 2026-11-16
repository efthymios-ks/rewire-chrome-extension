import { describe, expect, test } from 'vitest';
import { RequestExtraInfoHandler } from './RequestExtraInfoHandler';
import { TimelineRecordMapper } from './TimelineRecordMapper';
import { DefaultTimelineStore } from './DefaultTimelineStore';
import { aTimelineRecord } from '../../BackgroundTestData';

const TAB_ID = 7;

describe('RequestExtraInfoHandler', () => {
    test('handleAsync_WhenExtraInfoArrivesFirst_ShouldExposeTheRealHeadersInTheDetail', async () => {
        // Arrange
        const store = new DefaultTimelineStore();
        const handler = new RequestExtraInfoHandler(store);

        // Act
        await handler.handleAsync(TAB_ID, {
            requestId: 'request-1',
            associatedCookies: [],
            headers: {
                Accept: 'application/json',
                Cookie: 'session=1',
            },
            connectTiming: {
                requestTime: 1,
            },
        });
        store.add(aTimelineRecord());

        // Assert
        expect(TimelineRecordMapper.toDetail(store.get(TAB_ID, 'request-1')!).requestHeaders).toEqual([
            {
                name: 'Accept',
                value: 'application/json',
            },
            {
                name: 'Cookie',
                value: 'session=1',
            },
        ]);
    });
});
