import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { DurationText } from "../../Core/Formatting/DurationText";
import { StatusAppearance } from "../../Core/Formatting/StatusAppearance";
import { AppliedRuleText } from "./AppliedRuleText";
import { ContentKindLabels } from "./ContentKindLabels";

const PinnedGlyph = "★";
const UnpinnedGlyph = "☆";
const ActivationKeys = [
    "Enter",
    " ",
];

export interface TimelineRowActions {
    onSelect(entry: TimelineEntrySummary): void;
    onTogglePin: ((entry: TimelineEntrySummary) => void) | null;
    onContextMenu(
        entry: TimelineEntrySummary,
        x: number,
        y: number
    ): void;
}

function badge(
    text: string,
    className: string,
    title: string
): HTMLSpanElement | null {
    if (text === "") {
        return null;
    }

    return buildElement("span", {
        className,
        text,
        title,
    });
}

const RulesBadgeText = "Rules";

export const TimelineRow = {
    build(
        entry: TimelineEntrySummary,
        isPinned: boolean,
        actions: TimelineRowActions
    ): HTMLLIElement {
        const appliedRules = AppliedRuleText.unique(entry.appliedRules);
        const togglePin = actions.onTogglePin;
        const pinButton = togglePin === null ? null : buildElement("button", {
            className: "pin-toggle",
            text: isPinned ? PinnedGlyph : UnpinnedGlyph,
            title: isPinned ? "Unpin endpoint" : "Pin endpoint",
            attributes: {
                type: "button",
                "aria-pressed": String(isPinned),
            },
            listeners: {
                click: event => {
                    event.stopPropagation();
                    togglePin(entry);
                },
            },
        });

        return buildElement("li", {
            className: "timeline-row",
            title: entry.url,
            attributes: {
                role: "option",
                tabindex: "0",
            },
            listeners: {
                click: () => actions.onSelect(entry),
                contextmenu: event => {
                    event.preventDefault();
                    actions.onContextMenu(
                        entry,
                        event.clientX,
                        event.clientY
                    );
                },
                keydown: event => {
                    if (!ActivationKeys.includes(event.key)) {
                        return;
                    }

                    event.preventDefault();
                    actions.onSelect(entry);
                },
            },
            children: [
                buildElement("div", {
                    className: "row-line",
                    children: [
                        buildElement("span", {
                            className: "method",
                            text: entry.method,
                        }),
                        buildElement("span", {
                            className: `status ${StatusAppearance.classOf(entry)}`,
                            text: StatusAppearance.textOf(entry),
                            title: entry.errorText ?? "",
                        }),
                        buildElement("span", {
                            className: "path",
                            text: entry.path,
                        }),
                        pinButton,
                    ],
                }),
                buildElement("div", {
                    className: "row-line row-meta",
                    children: [
                        buildElement("span", {
                            className: "host",
                            text: entry.host,
                        }),
                        badge(
                            ContentKindLabels[entry.contentKind],
                            "kind-badge",
                            entry.mimeType
                        ),
                        badge(
                            appliedRules.length === 0 ? "" : RulesBadgeText,
                            "interception-badge",
                            appliedRules
                                .map(rule => AppliedRuleText.nameOf(rule))
                                .join("\n")
                        ),
                        buildElement("span", {
                            className: "duration",
                            text: DurationText.of(entry.durationInMilliseconds),
                        }),
                    ],
                }),
            ],
        });
    },
};
