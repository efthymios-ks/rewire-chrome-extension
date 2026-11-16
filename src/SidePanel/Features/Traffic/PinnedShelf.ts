import { EndpointKey } from '../../../Common/Urls/EndpointKey';
import { SafeUrl } from '../../../Common/Urls/SafeUrl';
import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import { buildElement } from '../../Core/Dom/buildElement';
import { DurationText } from '../../Core/Formatting/DurationText';
import { StatusAppearance } from '../../Core/Formatting/StatusAppearance';
import { Equalities } from '../../Core/Equalities';
import type { PanelContext } from '../Shell/PanelContext';
import { EntrySelection } from './EntrySelection';
import { TimelineEntries } from './TimelineEntries';

const UNPIN_GLYPH = '×';
const NO_CALLS_TEXT = 'no calls yet';

interface PinnedEndpoint {
    key: string;
    method: string;
    path: string;
}

function parseKey(key: string): PinnedEndpoint {
    const { method, url } = EndpointKey.parse(key);

    return {
        key,
        method,
        path: SafeUrl.parse(url)?.pathname ?? url,
    };
}

export interface ChipForOptions {
    endpoint: PinnedEndpoint;
    latest: TimelineEntrySummary | null;
    selectedEntryId: string | null;
}

export class PinnedShelf {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
        this.root = buildElement('section', {
            className: 'pinned-shelf',
            attributes: {
                'aria-label': 'Pinned endpoints',
            },
        });

        context.store.select({
            selector: state => [
                state.settings.pinnedEndpoints,
                state.entries,
                state.selectedEntryId,
            ],
            listener: () => this.render(),
            isEqual: Equalities.shallowArray,
        });
    }

    private render(): void {
        const state = this._context.store.getState();
        const pinned = state.settings.pinnedEndpoints.map(parseKey);
        this.root.hidden = pinned.length === 0 || !this._context.trafficFeatures.canPin;
        this.root.replaceChildren(...pinned.map(endpoint => this.chipFor({
            endpoint,
            latest: TimelineEntries.latestFor(state.entries, endpoint.key),
            selectedEntryId: state.selectedEntryId,
        })));
    }

    private chipFor({ endpoint, latest, selectedEntryId }: ChipForOptions): HTMLElement {
        const statusText = latest == null ? NO_CALLS_TEXT : StatusAppearance.textOf(latest);
        const statusClass = latest == null ? '' : StatusAppearance.classOf(latest);
        const durationText = latest == null ? '' : DurationText.of(latest.durationInMilliseconds);

        return buildElement('div', {
            className: 'pinned-chip',
            title: endpoint.key,
            attributes: latest != null && latest.id === selectedEntryId
                ? { 'data-selected': '' }
                : {},
            children: [
                buildElement('button', {
                    className: 'pinned-open',
                    attributes: {
                        type: 'button',
                    },
                    listeners: {
                        click: () => {
                            if (latest != null) {
                                EntrySelection.select(this._context.store, latest.id);
                            }
                        },
                    },
                    children: [
                        buildElement('span', {
                            className: 'method',
                            text: endpoint.method,
                        }),
                        buildElement('span', {
                            className: 'path',
                            text: endpoint.path,
                        }),
                        buildElement('span', {
                            className: `status ${statusClass}`,
                            text: statusText,
                        }),
                        buildElement('span', {
                            className: 'duration',
                            text: durationText,
                        }),
                    ],
                }),
                buildElement('button', {
                    className: 'pinned-remove',
                    text: UNPIN_GLYPH,
                    title: 'Unpin',
                    attributes: {
                        type: 'button',
                        'aria-label': `Unpin ${endpoint.key}`,
                    },
                    listeners: {
                        click: () => void this._context.settingsService.togglePinAsync(endpoint.key),
                    },
                }),
            ],
        });
    }
}
