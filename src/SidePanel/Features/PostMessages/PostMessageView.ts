import { FrameLabel } from '../../../Common/Urls/FrameLabel';
import { FRAME_LABELS } from '../../../Contracts/Live/FrameLabels';
import type { PostMessageRecord } from '../../../Contracts/Live/PostMessageRecord';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { buildElement } from '../../Core/Dom/buildElement';
import { Equalities } from '../../Core/Equalities';
import { FRAME_FILTERS } from '../../Core/FrameFilters';
import { ClockText } from '../../Core/Formatting/ClockText';
import { SizeText } from '../../Core/Formatting/SizeText';
import type { PanelState } from '../../Core/PanelState';
import { PanelVariables } from '../../Core/PanelVariables';
import { FrameSelect } from '../Frames/FrameSelect';
import { PageFrames } from '../Frames/PageFrames';
import { ListeningToggle } from '../Live/ListeningToggle';
import { LiveList, type LiveListItem } from '../Live/LiveList';
import { LiveSendBar } from '../Live/LiveSendBar';
import type { PanelContext } from '../Shell/PanelContext';

function iframeLabelsOf(state: PanelState): string[] {
    const labels = [
        ...PageFrames
            .of(state.entries.map(entry => entry.frame))
            .map(frame => FrameLabel.ofUrl(frame.url)),
        ...state.live.postMessages.flatMap(record => [
            record.from,
            record.to,
        ]),
    ];

    return [...new Set(labels)].filter(label => label !== FRAME_LABELS.Top);
}

function accepts(record: PostMessageRecord, filter: string): boolean {
    return filter === FRAME_FILTERS.All
        || record.from === filter
        || record.to === filter;
}

export class PostMessageView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _frameSelect: FrameSelect;
    private readonly _targetSelect: HTMLSelectElement;
    private readonly _list: LiveList;
    private readonly _sendBar: LiveSendBar;
    private _frameFilter: string = FRAME_FILTERS.All;

    constructor(context: PanelContext) {
        this._context = context;
        this._frameSelect = new FrameSelect(value => {
            this._frameFilter = value;
            this.render();
        });
        this._targetSelect = buildElement('select', {
            className: 'input post-target',
            attributes: {
                'aria-label': 'Target frame',
            },
        });
        this._list = new LiveList(context, 'No messages yet. Listen to page messages to see them.');
        this._sendBar = new LiveSendBar({
            className: 'post-send',
            placeholder: 'Data',
            leading: this._targetSelect,
            onSend: text => void this.sendAsync(text),
        });

        this.root = buildElement('section', {
            className: 'live-view post-view',
            children: [
                buildElement('div', {
                    className: 'view-header',
                    children: [
                        buildElement('h2', {
                            text: 'postMessage',
                        }),
                        buildElement('div', {
                            className: 'actions',
                            children: [
                                this._frameSelect.root,
                                ListeningToggle.build(context, 'postMessages'),
                            ],
                        }),
                    ],
                }),
                this._list.root,
                this._sendBar.root,
            ],
        });

        context.store.select({
            selector: state => [
                state.live.postMessages,
                state.entries,
            ],
            listener: () => this.render(),
            isEqual: Equalities.shallowArray,
        });
    }

    private render(): void {
        const state = this._context.store.getState();
        const labels = iframeLabelsOf(state);
        if (!PageFrames.isFixed(this._frameFilter) && !labels.includes(this._frameFilter)) {
            this._frameFilter = FRAME_FILTERS.All;
        }

        this._frameSelect.update(
            /* frames: */ labels.map(label => ({
                id: label,
                url: '',
                label,
            })),
            /* value: */ this._frameFilter,
        );
        this.renderTargets(labels);
        this._list.update(state.live.postMessages
            .filter(record => accepts(record, this._frameFilter))
            .map(record => this.itemOf(record)));
    }

    private renderTargets(labels: string[]): void {
        const current = this._targetSelect.value;
        const targets = [
            FRAME_LABELS.Top,
            ...labels,
        ];
        this._targetSelect.replaceChildren(...targets.map(target => buildElement('option', {
            text: `To ${target}`,
            attributes: {
                value: target,
            },
        })));
        this._targetSelect.value = targets.includes(current) ? current : FRAME_LABELS.Top;
    }

    private itemOf(record: PostMessageRecord): LiveListItem {
        return {
            id: record.id,
            title: [
                buildElement('span', {
                    text: `${record.from} → ${record.to}`,
                }),
                record.isMine
                    ? buildElement('span', {
                        className: 'tag',
                        text: 'Sent by you',
                    })
                    : null,
            ],
            at: record.at,
            data: record.data,
            hasDataLine: true,
            isMuted: false,
            facts: [
                `origin ${record.origin}`,
                SizeText.of(record.size),
                ClockText.precise(record.at),
            ],
            actions: [
                {
                    label: 'Use',
                    run: () => this.use(record),
                },
            ],
        };
    }

    private use(record: PostMessageRecord): void {
        this._targetSelect.value = record.to;
        this._sendBar.input.value = record.data;
        this._sendBar.input.focus();
    }

    private async sendAsync(text: string): Promise<void> {
        const state = this._context.store.getState();
        if (state.inspectedTab == null) {
            this._context.notifier.show('Open a page tab first.');

            return;
        }

        const sent = await this._context.connection.sendAsync<typeof PANEL_COMMAND_TYPE.SendPostMessage>({
            type: PANEL_COMMAND_TYPE.SendPostMessage,
            tabId: state.inspectedTab.tabId,
            target: this._targetSelect.value,
            data: PanelVariables.render(state, text),
        });
        if (sent.hasErrors) {
            this._context.notifier.show(sent.error);

            return;
        }

        if (!this._context.store.getState().liveListening.postMessages) {
            this._context.notifier.show('Sent. Listen to page messages to see it.');
        }
    }
}
