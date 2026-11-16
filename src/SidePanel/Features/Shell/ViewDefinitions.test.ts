import { describe, expect, test } from 'vitest';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { VIEW_ID } from '../../Core/ViewId';
import { VIEW_DEFINITIONS } from './ViewDefinitions';
import { aChannel, aPostMessage } from '../../../TestData';
import { aPanelHarness } from '../../PanelTestData';

describe('ViewDefinitions', () => {
    test('list_WhenRead_ShouldOfferEveryTabInOrder', () => {
        // Arrange
        const expected = [
            'Traffic',
            'Rules',
            'Cookie Jar',
            'JWT',
            'HTTP Client',
            'WS Client',
            'SSE Client',
            'postMessage',
            'HAR Inspector',
        ];

        // Act
        const labels = VIEW_DEFINITIONS.map(definition => definition.label);

        // Assert
        expect(labels).toEqual(expected);
    });

    test.each([
        [
            VIEW_ID.Client,
            'client-view',
        ],
        [
            VIEW_ID.Jwt,
            'jwt-view',
        ],
        [
            VIEW_ID.HarInspector,
            'har-view',
        ],
        [
            VIEW_ID.WsClient,
            'ws-view',
        ],
        [
            VIEW_ID.SseClient,
            'sse-view',
        ],
        [
            VIEW_ID.PostMessage,
            'post-view',
        ],
    ])('create_WhenTheViewIs(%s)_ShouldBuildIt(%s)', (viewId, expected) => {
        // Arrange
        const definition = VIEW_DEFINITIONS.find(candidate => candidate.id === viewId)!;

        // Act
        const root = definition.create(aPanelHarness().context);

        // Assert
        expect(root.classList.contains(expected)).toBe(true);
    });

    test('badgeOf_WhenLiveChannelsAreOpen_ShouldCountOpenSocketsStreamsAndMessages', () => {
        // Arrange
        const state = aPanelHarness({
            live: {
                channels: [
                    aChannel({ id: 'ws-1', kind: LIVE_CHANNEL_KIND.WebSocket, isOpen: true }),
                    aChannel({ id: 'ws-2', kind: LIVE_CHANNEL_KIND.WebSocket, isOpen: false }),
                    aChannel({ id: 'sse-1', kind: LIVE_CHANNEL_KIND.EventStream, isOpen: true }),
                ],
                messages: [],
                postMessages: [
                    aPostMessage(),
                ],
            },
        }).store.getState();

        // Act
        const badges = [
            VIEW_ID.WsClient,
            VIEW_ID.SseClient,
            VIEW_ID.PostMessage,
        ].map(viewId => VIEW_DEFINITIONS.find(candidate => candidate.id === viewId)!.badgeOf(state));

        // Assert
        expect(badges).toEqual([
            '1',
            '1',
            '1',
        ]);
    });
});
