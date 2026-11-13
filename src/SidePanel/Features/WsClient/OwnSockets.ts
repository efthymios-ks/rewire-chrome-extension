import { ByteSize } from "../../../Common/Encoding/ByteSize";
import { Base64Text } from "../../../Common/Encoding/Base64Text";
import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";
import type { LiveChannel } from "../../../Contracts/Live/LiveChannel";
import { LiveChannelKind } from "../../../Contracts/Live/LiveChannelKind";
import { LiveMessageDirection } from "../../../Contracts/Live/LiveMessageDirection";
import { OwnChannels } from "../../../Contracts/Live/OwnChannels";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { LiveState } from "../../Core/LiveState";
import type { PanelState } from "../../Core/PanelState";
import type { Store } from "../../Core/Store";
import { LiveEntries } from "../Live/LiveEntries";
import type { IHandshakeHeaderRules } from "./HandshakeHeaderRules";

const TextOpcode = 1;
const BinaryOpcode = 2;
const ChannelPrefix = "mine-ws-";
const OpenState = 1;

export type SocketFactory = (url: string) => WebSocket;

interface OwnSocket {
    socket: WebSocket;
    ruleId: number | null;
}

export interface OwnSocketsDependencies {
    store: Store<PanelState>;
    headerRules: IHandshakeHeaderRules;
    createSocket: SocketFactory;
    now: () => Date;
}

export class OwnSockets {
    private readonly _dependencies: OwnSocketsDependencies;
    private readonly _sockets = new Map<string, OwnSocket>();
    private _sequence = 0;

    constructor(dependencies: OwnSocketsDependencies) {
        this._dependencies = dependencies;
    }

    async connect(url: string, headers: HeaderEntry[]): Promise<Result<string>> {
        const ruleId = await this.addHeaderRule(url, headers);
        if (ruleId.hasErrors) {
            return ruleId;
        }

        let socket: WebSocket;
        try {
            socket = this._dependencies.createSocket(url);
        } catch (error) {
            await this.removeHeaderRule(ruleId.value);

            return Result.fail(`Can't connect to ${url}: ${ErrorText.of(error)}`);
        }

        this._sequence += 1;
        const channel: LiveChannel = {
            id: `${ChannelPrefix}${this._sequence}`,
            tabId: OwnChannels.TabId,
            kind: LiveChannelKind.WebSocket,
            url,
            isOpen: true,
            isMine: true,
            openedAt: this._dependencies.now().toISOString(),
        };
        this._sockets.set(
            channel.id,
            {
                socket,
                ruleId: ruleId.value,
            }
        );
        this.listen(channel, socket);
        this.update(live => LiveEntries.upsertChannel(live, channel));

        return Result.ok(channel.id);
    }

    send(channelId: string, text: string): Result<void> {
        const owned = this._sockets.get(channelId);
        if (owned === undefined || owned.socket.readyState !== OpenState) {
            return Result.fail("This socket isn't open.");
        }

        owned.socket.send(text);
        this.addMessage(
            channelId,
            LiveMessageDirection.Sent,
            text,
            TextOpcode
        );

        return Result.done();
    }

    close(channelId: string): void {
        this._sockets.get(channelId)?.socket.close();
    }

    private listen(channel: LiveChannel, socket: WebSocket): void {
        socket.binaryType = "arraybuffer";
        socket.addEventListener("message", event => {
            const isText = typeof event.data === "string";
            this.addMessage(
                channel.id,
                LiveMessageDirection.Received,
                isText ? event.data as string : Base64Text.fromBytes(new Uint8Array(event.data as ArrayBuffer)),
                isText ? TextOpcode : BinaryOpcode
            );
        });
        socket.addEventListener("close", () => {
            const owned = this._sockets.get(channel.id);
            this._sockets.delete(channel.id);
            if (owned !== undefined) {
                void this.removeHeaderRule(owned.ruleId);
            }

            this.update(live => LiveEntries.upsertChannel(
                live,
                {
                    ...channel,
                    isOpen: false,
                }
            ));
        });
    }

    private addMessage(
        channelId: string,
        direction: LiveMessageDirection,
        data: string,
        opcode: number
    ): void {
        this._sequence += 1;
        this.update(live => LiveEntries.addMessage(
            live,
            {
                id: `${channelId}-${this._sequence}`,
                channelId,
                direction,
                at: this._dependencies.now().toISOString(),
                data,
                size: opcode === BinaryOpcode ? ByteSize.ofBase64(data) : ByteSize.ofText(data),
                opcode,
                eventName: null,
                eventId: null,
                retry: null,
            }
        ));
    }

    private async addHeaderRule(url: string, headers: HeaderEntry[]): Promise<Result<number | null>> {
        if (headers.length === 0) {
            return Result.ok(null);
        }

        return this._dependencies.headerRules.add(url, headers);
    }

    private async removeHeaderRule(ruleId: number | null): Promise<void> {
        if (ruleId !== null) {
            await this._dependencies.headerRules.remove(ruleId);
        }
    }

    private update(change: (live: LiveState) => LiveState): void {
        this._dependencies.store.update(state => ({
            ...state,
            live: change(state.live),
        }));
    }
}
