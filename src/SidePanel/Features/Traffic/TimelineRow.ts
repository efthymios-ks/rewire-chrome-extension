import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import { buildElement } from '../../Core/Dom/buildElement';
import { DurationText } from '../../Core/Formatting/DurationText';
import { StatusAppearance } from '../../Core/Formatting/StatusAppearance';
import { AppliedRuleText } from './AppliedRuleText';
import { CONTENT_KIND_LABELS } from './ContentKindLabels';

const PINNED_GLYPH = '★';
const UNPINNED_GLYPH = '☆';
const ACTIVATION_KEYS = [
    'Enter',
    ' ',
];

export interface OnContextMenuOptions {
    entry: TimelineEntrySummary;
    clientX: number;
    clientY: number;
}

export interface TimelineRowActions {
    onSelect(entry: TimelineEntrySummary): void;
    onTogglePin: ((entry: TimelineEntrySummary) => void) | null;
    onContextMenu(options: OnContextMenuOptions): void;
}

interface BadgeOptions {
    text: string;
    className: string;
    title: string;
}

function badge({ text, className, title }: BadgeOptions): HTMLSpanElement | null {
    if (text === '') {
        return null;
    }

    return buildElement('span', {
        className,
        text,
        title,
    });
}

const RULES_BADGE_TEXT = 'Rules';

export interface BuildOptions {
    entry: TimelineEntrySummary;
    isPinned: boolean;
    actions: TimelineRowActions;
}

export const TimelineRow = {
    build({ entry, isPinned, actions }: BuildOptions): HTMLLIElement {
        const appliedRules = AppliedRuleText.unique(entry.appliedRules);
        const togglePin = actions.onTogglePin;
        const pinButton = togglePin == null
            ? null
            : buildElement('button', {
                className: 'pin-toggle',
                text: isPinned ? PINNED_GLYPH : UNPINNED_GLYPH,
                title: isPinned ? 'Unpin endpoint' : 'Pin endpoint',
                attributes: {
                    type: 'button',
                    'aria-label': 'Pin endpoint',
                    'aria-pressed': String(isPinned),
                },
                listeners: {
                    click: event => {
                        event.stopPropagation();
                        togglePin(entry);
                    },
                },
            });

        return buildElement('li', {
            className: 'timeline-row',
            title: entry.url,
            attributes: {
                role: 'option',
                tabindex: '0',
            },
            listeners: {
                click: () => actions.onSelect(entry),
                contextmenu: event => {
                    event.preventDefault();
                    actions.onContextMenu({ entry, clientX: event.clientX, clientY: event.clientY });
                },
                keydown: event => {
                    if (!ACTIVATION_KEYS.includes(event.key)) {
                        return;
                    }

                    event.preventDefault();
                    actions.onSelect(entry);
                },
            },
            children: [
                buildElement('div', {
                    className: 'row-line',
                    children: [
                        buildElement('span', {
                            className: 'method',
                            text: entry.method,
                        }),
                        buildElement('span', {
                            className: `status ${StatusAppearance.classOf(entry)}`,
                            text: StatusAppearance.textOf(entry),
                            title: entry.errorText ?? '',
                        }),
                        buildElement('span', {
                            className: 'path',
                            text: entry.path,
                        }),
                        pinButton,
                    ],
                }),
                buildElement('div', {
                    className: 'row-line row-meta',
                    children: [
                        buildElement('span', {
                            className: 'host',
                            text: entry.host,
                        }),
                        badge({
                            text: CONTENT_KIND_LABELS[entry.contentKind],
                            className: 'kind-badge',
                            title: entry.mimeType,
                        }),
                        badge({
                            text: appliedRules.length === 0 ? '' : RULES_BADGE_TEXT,
                            className: 'interception-badge',
                            title: appliedRules
                                .map(rule => AppliedRuleText.nameOf(rule))
                                .join('\n'),
                        }),
                        buildElement('span', {
                            className: 'duration',
                            text: DurationText.of(entry.durationInMilliseconds),
                        }),
                    ],
                }),
            ],
        });
    },
};
