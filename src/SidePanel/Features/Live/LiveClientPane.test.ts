import { describe, expect, test, vi } from 'vitest';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import type { LiveMessage } from '../../../Contracts/Live/LiveMessage';
import type { PanelState } from '../../Core/PanelState';
import { LiveClientPane } from './LiveClientPane';
import { aChannel, aLiveMessage, aProfile, aSettings } from '../../../TestData';
import { aPanelHarness, buttonNamed, click, typeInto } from '../../PanelTestData';

function itemOf(message: LiveMessage) {
    return {
        id: message.id,
        title: [message.data ?? ''],
        at: message.at,
        data: message.data,
        hasDataLine: false,
        isMuted: false,
        facts: [],
        actions: [],
    };
}

function aPane(state: Partial<PanelState> = {}) {
    const harness = aPanelHarness(state);
    const onConnect = vi.fn();
    const onClose = vi.fn();
    const onRender = vi.fn();
    const footer = document.createElement('div');
    footer.className = 'test-footer';
    const pane = new LiveClientPane({
        context: harness.context,
        kind: LIVE_CHANNEL_KIND.WebSocket,
        className: 'test-view',
        title: 'Test Client',
        listeningKind: 'webSockets',
        connect: {
            placeholder: 'wss://live.example.com',
            buttonText: 'Connect',
            missingUrlText: 'Enter a URL first.',
            onConnect,
        },
        channels: {
            title: 'Channels',
            emptyText: 'No channels.',
            closeTitle: 'Close this channel',
            removeTitle: 'Remove this channel',
            clearClosedTitle: 'Remove every closed channel',
            onClose,
        },
        messages: {
            title: 'Messages',
            emptyText: 'No messages.',
            itemOf,
            matches: (message, filter) => (message.data ?? '').toLowerCase().includes(filter),
        },
        footer,
        onRender,
    });

    return {
        harness,
        pane,
        onConnect,
        onClose,
        onRender,
    };
}

const TWO_KINDS_STATE: Partial<PanelState> = {
    live: {
        channels: [
            aChannel({ id: 'ws-1' }),
            aChannel({ id: 'sse-1', kind: LIVE_CHANNEL_KIND.EventStream }),
            aChannel({ id: 'ws-2', isOpen: false }),
        ],
        messages: [
            aLiveMessage({ id: 'frame-1', channelId: 'ws-1', data: 'first' }),
            aLiveMessage({ id: 'frame-2', channelId: 'ws-2', data: 'price' }),
            aLiveMessage({ id: 'frame-3', channelId: 'ws-2', data: 'chat' }),
        ],
        postMessages: [],
    },
};

describe('LiveClientPane', () => {
    test('constructor_WhenBuilt_ShouldLayOutTheSharedPartsAroundTheFooter', () => {
        // Arrange
        const state = {};

        // Act
        const { pane } = aPane(state);

        // Assert
        expect(pane.root.className).toBe('live-view test-view');
        expect(pane.root.querySelector('h2')?.textContent).toBe('Test Client');
        const titles = [...pane.root.querySelectorAll('.live-section-title')];
        expect(titles.map(title => title.textContent)).toEqual([
            'Channels',
            'Messages',
        ]);
        expect(pane.root.lastElementChild?.className).toBe('test-footer');
        expect(pane.root.querySelector('.live-channels')?.textContent).toBe('No channels.');
    });

    test('render_WhenChannelsOfSeveralKindsExist_ShouldListOnlyItsKindAndShowTheLatest', () => {
        // Arrange
        const state = TWO_KINDS_STATE;

        // Act
        const { pane, onRender } = aPane(state);

        // Assert
        expect(pane.root.querySelectorAll('.live-channel')).toHaveLength(2);
        expect(pane.selected()?.id).toBe('ws-2');
        expect(pane.root.querySelectorAll('.live-list .live-item')).toHaveLength(2);
        expect(buttonNamed(pane.root, 'Clear closed').hidden).toBe(false);
        expect(onRender.mock.lastCall?.[0]?.id).toBe('ws-2');
    });

    test('select_WhenAnotherChannelIsPicked_ShouldShowItsMessages', () => {
        // Arrange
        const { pane, onRender } = aPane(TWO_KINDS_STATE);

        // Act
        pane.select('ws-1');

        // Assert
        expect(pane.selected()?.id).toBe('ws-1');
        expect(pane.root.querySelectorAll('.live-list .live-item')).toHaveLength(1);
        expect(onRender.mock.lastCall?.[0]?.id).toBe('ws-1');
    });

    test('filter_WhenTextIsTyped_ShouldKeepOnlyMatchingMessages', () => {
        // Arrange
        const { pane } = aPane(TWO_KINDS_STATE);

        // Act
        typeInto(pane.root.querySelector<HTMLInputElement>('.live-filter')!, 'CHAT');

        // Assert
        expect(pane.root.querySelectorAll('.live-list .live-item')).toHaveLength(1);
    });

    test('connect_WhenTheUrlIsEmpty_ShouldAskForOneAndNotConnect', () => {
        // Arrange
        const { harness, pane, onConnect } = aPane();

        // Act
        click(buttonNamed(pane.root, 'Connect'));

        // Assert
        expect(harness.noticeText()).toBe('Enter a URL first.');
        expect(onConnect).not.toHaveBeenCalled();
    });

    test('connect_WhenTheUrlAndHeadersUseVariables_ShouldPassThemRendered', () => {
        // Arrange
        const { pane, onConnect } = aPane({
            settings: aSettings({
                profiles: [
                    aProfile({
                        variables: [
                            {
                                name: 'host',
                                value: 'live.example.com',
                            },
                        ],
                    }),
                ],
            }),
        });
        pane.root.querySelector<HTMLInputElement>('.live-url')!.value = ' wss://{{host}}/socket ';
        click(buttonNamed(pane.root, 'Add header'));
        const inputs = [...pane.root.querySelectorAll<HTMLInputElement>('.header-row input')];
        typeInto(inputs[0]!, 'X-Host');
        typeInto(inputs[1]!, '{{host}}');

        // Act
        click(buttonNamed(pane.root, 'Connect'));

        // Assert
        expect(onConnect).toHaveBeenCalledWith(
            /* url: */ 'wss://live.example.com/socket',
            /* headers: */ [
                {
                    name: 'X-Host',
                    value: 'live.example.com',
                },
            ],
        );
    });

    test('close_WhenMyOpenChannelIsClosed_ShouldHandItToTheFeature', () => {
        // Arrange
        const { pane, onClose } = aPane({
            live: {
                channels: [
                    aChannel({
                        id: 'ws-mine',
                        overrides: {
                            isMine: true,
                        },
                    }),
                ],
                messages: [],
                postMessages: [],
            },
        });

        // Act
        click(pane.root.querySelector("[title='Close this channel']"));

        // Assert
        expect(onClose).toHaveBeenCalledWith('ws-mine');
    });
});
