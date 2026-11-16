import { describe, expect, test } from 'vitest';
import { ResponseExtraInfoHandler } from './ResponseExtraInfoHandler';
import { DefaultTimelineStore } from './DefaultTimelineStore';
import { aTimelineRecord } from '../../BackgroundTestData';

const TAB_ID = 7;

describe('ResponseExtraInfoHandler', () => {
    test('handleAsync_WhenSeveralCookiesAreSet_ShouldSplitThem', async () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aTimelineRecord());
        const handler = new ResponseExtraInfoHandler(store);

        // Act
        await handler.handleAsync(TAB_ID, {
            requestId: 'request-1',
            blockedCookies: [],
            headers: {
                'set-cookie': 'a=1\nb=2',
            },
            resourceIPAddressSpace: 'Public',
            statusCode: 200,
        });

        // Assert
        expect(store.get(TAB_ID, 'request-1')?.rawResponseHeaders).toEqual([
            {
                name: 'set-cookie',
                value: 'a=1',
            },
            {
                name: 'set-cookie',
                value: 'b=2',
            },
        ]);
    });
});
