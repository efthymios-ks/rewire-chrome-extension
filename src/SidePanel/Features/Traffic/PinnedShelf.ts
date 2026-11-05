import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { DurationText } from "../../Core/Formatting/DurationText";
import { StatusAppearance } from "../../Core/Formatting/StatusAppearance";
import { Equalities } from "../../Core/Equalities";
import type { PanelContext } from "../Shell/PanelContext";
import { EntrySelection } from "./EntrySelection";
import { TimelineEntries } from "./TimelineEntries";

const KeySeparator = " ";
const UnpinGlyph = "×";
const NoCallsText = "no calls yet";

interface PinnedEndpoint {
    key: string;
    method: string;
    path: string;
}

function parseKey(key: string): PinnedEndpoint {
    const separatorIndex = key.indexOf(KeySeparator);
    const method = key.slice(0, separatorIndex);
    const url = key.slice(separatorIndex + 1);

    return {
        key,
        method,
        path: SafeUrl.parse(url)?.pathname ?? url,
    };
}

export class PinnedShelf {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
        this.root = buildElement("section", {
            className: "pinned-shelf",
            attributes: {
                "aria-label": "Pinned endpoints",
            },
        });

        context.store.select(
            state => [
                state.settings.pinnedEndpoints,
                state.entries,
                state.selectedEntryId,
            ],
            () => this.render(),
            Equalities.shallowArray
        );
    }

    private render(): void {
        const state = this._context.store.getState();
        const pinned = state.settings.pinnedEndpoints.map(parseKey);
        this.root.hidden = pinned.length === 0;
        this.root.replaceChildren(...pinned.map(endpoint => this.chipFor(
            endpoint,
            TimelineEntries.latestFor(state.entries, endpoint.key),
            state.selectedEntryId
        )));
    }

    private chipFor(
        endpoint: PinnedEndpoint,
        latest: TimelineEntrySummary | null,
        selectedEntryId: string | null
    ): HTMLElement {
        const statusText = latest === null ? NoCallsText : StatusAppearance.textOf(latest);
        const statusClass = latest === null ? "" : StatusAppearance.classOf(latest);
        const durationText = latest === null ? "" : DurationText.of(latest.durationInMilliseconds);

        return buildElement("div", {
            className: latest !== null && latest.id === selectedEntryId ? "pinned-chip selected" : "pinned-chip",
            title: endpoint.key,
            children: [
                buildElement("button", {
                    className: "pinned-open",
                    attributes: {
                        type: "button",
                    },
                    listeners: {
                        click: () => {
                            if (latest !== null) {
                                EntrySelection.select(this._context.store, latest.id);
                            }
                        },
                    },
                    children: [
                        buildElement("span", {
                            className: "method",
                            text: endpoint.method,
                        }),
                        buildElement("span", {
                            className: "path",
                            text: endpoint.path,
                        }),
                        buildElement("span", {
                            className: `status ${statusClass}`,
                            text: statusText,
                        }),
                        buildElement("span", {
                            className: "duration",
                            text: durationText,
                        }),
                    ],
                }),
                buildElement("button", {
                    className: "pinned-remove",
                    text: UnpinGlyph,
                    title: "Unpin",
                    attributes: {
                        type: "button",
                    },
                    listeners: {
                        click: () => void this._context.settingsService.togglePin(endpoint.key),
                    },
                }),
            ],
        });
    }
}
