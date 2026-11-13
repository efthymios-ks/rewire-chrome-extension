import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import type { LiveChannel } from "../../../Contracts/Live/LiveChannel";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";

export interface LiveChannelRow {
    channel: LiveChannel;
    count: number;
}

export interface LiveChannelListArguments {
    emptyText: string;
    closeTitle: string;
    removeTitle: string;
    onSelect: (channelId: string) => void;
    onClose: (channelId: string) => void;
    onRemove: (channelId: string) => void;
}

function addressOf(url: string): string {
    const parsed = SafeUrl.parse(url);

    return parsed === null ? url : `${parsed.host}${parsed.pathname}${parsed.search}`;
}

export class LiveChannelList {
    readonly root: HTMLElement;

    private readonly _arguments: LiveChannelListArguments;

    constructor(args: LiveChannelListArguments) {
        this._arguments = args;
        this.root = buildElement("ul", {
            className: "live-channels",
        });
    }

    update(rows: LiveChannelRow[], selectedId: string | null): void {
        if (rows.length === 0) {
            this.root.replaceChildren(buildElement("li", {
                className: "muted live-empty",
                text: this._arguments.emptyText,
            }));

            return;
        }

        this.root.replaceChildren(...rows
            .toReversed()
            .map(row => this.rowOf(row, row.channel.id === selectedId)));
    }

    private actionOf(channel: LiveChannel): HTMLButtonElement | null {
        if (!channel.isOpen) {
            return FormControls.button({
                text: "×",
                variant: ButtonVariants.Ghost,
                title: this._arguments.removeTitle,
                onClick: () => this._arguments.onRemove(channel.id),
            });
        }

        return channel.isMine
            ? FormControls.button({
                text: "×",
                variant: ButtonVariants.Ghost,
                title: this._arguments.closeTitle,
                onClick: () => this._arguments.onClose(channel.id),
            })
            : null;
    }

    private rowOf(row: LiveChannelRow, isSelected: boolean): HTMLElement {
        const { channel } = row;

        return buildElement("li", {
            className: isSelected ? "live-channel selected" : "live-channel",
            children: [
                buildElement("button", {
                    className: "live-channel-pick",
                    attributes: {
                        type: "button",
                        "aria-pressed": String(isSelected),
                    },
                    children: [
                        buildElement("span", {
                            className: channel.isOpen ? "live-dot open" : "live-dot",
                            title: channel.isOpen ? "Open" : "Closed",
                        }),
                        buildElement("span", {
                            className: "tag",
                            text: channel.isMine ? "Mine" : "Page",
                        }),
                        buildElement("span", {
                            className: "live-channel-address",
                            text: addressOf(channel.url),
                            title: channel.url,
                        }),
                        buildElement("span", {
                            className: "muted live-channel-count",
                            text: String(row.count),
                        }),
                    ],
                    listeners: {
                        click: () => this._arguments.onSelect(channel.id),
                    },
                }),
                this.actionOf(channel),
            ],
        });
    }
}
