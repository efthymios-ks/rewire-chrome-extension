import { describe, expect, test } from 'vitest';
import { SearchTimelineEndpoint } from './SearchTimelineEndpoint';
import { DefaultTimelineStore } from '../../Features/Capture/DefaultTimelineStore';
import { RequestBodyDecoder } from '../../Features/Capture/RequestBodyDecoder';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { SEARCH_FIELDS } from '../../../Contracts/Search/SearchField';
import { SEARCH_SCOPES } from '../../../Contracts/Search/SearchScope';
import { aTimelineRecord, compressAsync, utf8Of } from '../../BackgroundTestData';

const TAB_ID = 7;

describe('SearchTimelineEndpoint', () => {
    test('handleAsync_WhenTheBodyMatches_ShouldReturnTheEntry', async () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aTimelineRecord());
        const endpoint = new SearchTimelineEndpoint(store);

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.SearchTimeline,
            tabId: TAB_ID,
            query: {
                text: 'ada',
                isRegex: false,
                scopes: [SEARCH_SCOPES.ResponseBody],
            },
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [
                {
                    entryId: 'request-1',
                    fields: [SEARCH_FIELDS.ResponseBody],
                    count: 1,
                },
            ],
        });
    });

    test('handleAsync_WhenOnlyTheUrlIsSearched_ShouldIgnoreTheBody', async () => {
        // Arrange
        const store = new DefaultTimelineStore();
        store.add(aTimelineRecord());
        const endpoint = new SearchTimelineEndpoint(store);

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.SearchTimeline,
            tabId: TAB_ID,
            query: {
                text: 'ada',
                isRegex: false,
                scopes: [SEARCH_SCOPES.Url],
            },
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });

    test('handleAsync_WhenTheTextIsInsideADecompressedRequestBody_ShouldFindIt', async () => {
        // Arrange
        const captured = await RequestBodyDecoder.decodeAsync({
            bytes: await compressAsync('{"event":"checkout-clicked"}', 'gzip'),
            headers: [],
        });
        const store = new DefaultTimelineStore();
        store.add(aTimelineRecord({
            ...captured,
            responseBody: null,
        }));
        const endpoint = new SearchTimelineEndpoint(store);

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.SearchTimeline,
            tabId: TAB_ID,
            query: {
                text: 'checkout',
                isRegex: false,
                scopes: [SEARCH_SCOPES.RequestBody],
            },
        });

        // Assert
        expect(result).toEqual({
            hasErrors: false,
            value: [
                {
                    entryId: 'request-1',
                    fields: [SEARCH_FIELDS.RequestBody],
                    count: 1,
                },
            ],
        });
    });

    test('handleAsync_WhenTheTextIsOnlyInsideABinaryRequestBody_ShouldIgnoreIt', async () => {
        // Arrange
        const captured = await RequestBodyDecoder.decodeAsync({
            bytes: new Uint8Array([
                0xff,
                ...utf8Of('checkout'),
                0x00,
            ]),
            headers: [],
        });
        const store = new DefaultTimelineStore();
        store.add(aTimelineRecord({
            ...captured,
            responseBody: null,
        }));
        const endpoint = new SearchTimelineEndpoint(store);

        // Act
        const result = await endpoint.handleAsync({
            type: PANEL_COMMAND_TYPE.SearchTimeline,
            tabId: TAB_ID,
            query: {
                text: 'checkout',
                isRegex: false,
                scopes: [SEARCH_SCOPES.RequestBody],
            },
        });

        // Assert
        expect(captured.requestBodyBase64).not.toBeNull();
        expect(result).toEqual({
            hasErrors: false,
            value: [],
        });
    });
});
