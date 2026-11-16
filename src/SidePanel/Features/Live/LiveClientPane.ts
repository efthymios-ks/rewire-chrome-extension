import type { LiveChannel } from '../../../Contracts/Live/LiveChannel';
import type { LiveChannelKind } from '../../../Contracts/Live/LiveChannelKind';
import type { LiveListeningKind } from '../../../Contracts/Live/LiveListening';
import type { LiveMessage } from '../../../Contracts/Live/LiveMessage';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import { Equalities } from '../../Core/Equalities';
import { PanelVariables } from '../../Core/PanelVariables';
import type { PanelContext } from '../Shell/PanelContext';
import { HeaderRowsEditor } from './HeaderRowsEditor';
import { ListeningToggle } from './ListeningToggle';
import { LiveChannelList } from './LiveChannelList';
import { LiveChannelRemover } from './LiveChannelRemover';
import { LiveEntries } from './LiveEntries';
import { LiveList, type LiveListItem } from './LiveList';

export interface LiveClientPaneOptions {
    context: PanelContext;
    kind: LiveChannelKind;
    className: string;
    title: string;
    listeningKind: LiveListeningKind;
    connect: {
        placeholder: string;
        buttonText: string;
        missingUrlText: string;
        onConnect: (url: string, headers: HeaderEntry[]) => void;
    };
    channels: {
        title: string;
        emptyText: string;
        closeTitle: string;
        removeTitle: string;
        clearClosedTitle: string;
        onClose: (channelId: string) => void;
    };
    messages: {
        title: string;
        emptyText: string;
        itemOf: (message: LiveMessage) => LiveListItem;
        matches: (message: LiveMessage, filter: string) => boolean;
    };
    footer?: HTMLElement;
    onRender?: (selected: LiveChannel | undefined) => void;
}

function sectionRowOf(title: string, control: HTMLElement): HTMLElement {
    return buildElement('div', {
        className: 'live-section-row',
        children: [
            buildElement('h3', {
                className: 'live-section-title',
                text: title,
            }),
            control,
        ],
    });
}

export class LiveClientPane {
    readonly root: HTMLElement;

    private readonly _options: LiveClientPaneOptions;
    private readonly _urlInput: HTMLInputElement;
    private readonly _headers = new HeaderRowsEditor();
    private readonly _channelList: LiveChannelList;
    private readonly _messages: LiveList;
    private readonly _filter: HTMLInputElement;
    private readonly _remover: LiveChannelRemover;
    private readonly _clearClosed: HTMLButtonElement;
    private _selectedId: string | null = null;

    constructor(options: LiveClientPaneOptions) {
        const { context, connect, channels, messages } = options;
        this._options = options;
        this._urlInput = FormControls.textInput({
            value: '',
            placeholder: connect.placeholder,
            className: 'input live-url',
        });
        this._channelList = new LiveChannelList({
            emptyText: channels.emptyText,
            closeTitle: channels.closeTitle,
            removeTitle: channels.removeTitle,
            onSelect: channelId => this.select(channelId),
            onClose: channelId => channels.onClose(channelId),
            onRemove: channelId => void this._remover.removeAsync([channelId]),
        });
        this._remover = new LiveChannelRemover(context);
        this._clearClosed = FormControls.button({
            text: 'Clear closed',
            variant: BUTTON_VARIANTS.Ghost,
            title: channels.clearClosedTitle,
            onClick: () => void this._remover.removeAsync(this.closedIds()),
        });
        this._messages = new LiveList(context, messages.emptyText);
        this._filter = FormControls.textInput({
            value: '',
            placeholder: 'Filter',
            className: 'input live-filter',
            onInput: () => this.render(),
        });

        this.root = buildElement('section', {
            className: `live-view ${options.className}`,
            children: [
                buildElement('div', {
                    className: 'view-header',
                    children: [
                        buildElement('h2', {
                            text: options.title,
                        }),
                        ListeningToggle.build(context, options.listeningKind),
                    ],
                }),
                buildElement('div', {
                    className: 'live-connect',
                    children: [
                        this._urlInput,
                        FormControls.button({
                            text: connect.buttonText,
                            variant: BUTTON_VARIANTS.Primary,
                            onClick: () => this.connect(),
                        }),
                    ],
                }),
                this._headers.root,
                sectionRowOf(channels.title, this._clearClosed),
                this._channelList.root,
                sectionRowOf(messages.title, this._filter),
                this._messages.root,
                options.footer ?? null,
            ],
        });

        context.store.select({
            selector: state => [
                state.live.channels,
                state.live.messages,
            ],
            listener: () => this.render(),
            isEqual: Equalities.shallowArray,
        });
    }

    select(channelId: string): void {
        this._selectedId = channelId;
        this.render();
    }

    selected(): LiveChannel | undefined {
        return this.selectedOf(this.channels());
    }

    private connect(): void {
        const { context, connect } = this._options;
        const state = context.store.getState();
        const url = PanelVariables.render(
            /* state: */ state,
            /* text: */ this._urlInput.value.trim(),
        );
        if (url === '') {
            context.notifier.show(connect.missingUrlText);

            return;
        }

        const headers = this._headers
            .values()
            .map(header => ({
                name: header.name,
                value: PanelVariables.render(state, header.value),
            }));
        connect.onConnect(url, headers);
    }

    private render(): void {
        const { context, messages, onRender } = this._options;
        const { live } = context.store.getState();
        const channels = this.channels();
        this._clearClosed.hidden = !channels.some(channel => !channel.isOpen);
        const selected = this.selectedOf(channels);
        this._channelList.update(
            /* rows: */ channels.map(channel => ({
                channel,
                count: LiveEntries.messagesOf(live, channel.id).length,
            })),
            /* selectedId: */ selected?.id ?? null,
        );

        const filter = this._filter.value.trim().toLowerCase();
        this._messages.update(selected == null
            ? []
            : LiveEntries
                .messagesOf(live, selected.id)
                .filter(message => messages.matches(message, filter))
                .map(message => messages.itemOf(message)));
        onRender?.(selected);
    }

    private channels(): LiveChannel[] {
        return this._options.context.store
            .getState()
            .live.channels
            .filter(channel => channel.kind === this._options.kind);
    }

    private closedIds(): string[] {
        return this.channels()
            .filter(channel => !channel.isOpen)
            .map(channel => channel.id);
    }

    private selectedOf(channels: LiveChannel[]): LiveChannel | undefined {
        return channels.find(channel => channel.id === this._selectedId) ?? channels.at(-1);
    }
}
