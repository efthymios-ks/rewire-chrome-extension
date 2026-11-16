import { ByteSize } from '../../../Common/Encoding/ByteSize';
import { Base64Text } from '../../../Common/Encoding/Base64Text';
import { Result } from '../../../Common/Results/Result';
import type { LiveChannel } from '../../../Contracts/Live/LiveChannel';
import { LIVE_CHANNEL_KIND } from '../../../Contracts/Live/LiveChannelKind';
import { LIVE_MESSAGE_DIRECTION, type LiveMessageDirection } from '../../../Contracts/Live/LiveMessageDirection';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { PanelState } from '../../Core/PanelState';
import type { Store } from '../../Core/Store';
import { OwnChannelRegistry } from '../Live/OwnChannelRegistry';
import type { HandshakeHeaderRules } from './HandshakeHeaderRules';

const TEXT_OPCODE = 1;
const BINARY_OPCODE = 2;
const CHANNEL_PREFIX = 'mine-ws-';
const OPEN_STATE = 1;

export type SocketFactory = (url: string) => WebSocket;

interface OwnSocket {
    socket: WebSocket;
    ruleId: number | null;
}

export interface OwnSocketsDependencies {
    store: Store<PanelState>;
    headerRules: HandshakeHeaderRules;
    createSocket: SocketFactory;
    now: () => Date;
}

export interface AddMessageOptions {
    channelId: string;
    direction: LiveMessageDirection;
    data: string;
    opcode: number;
}

export class OwnSockets {
    private readonly _dependencies: OwnSocketsDependencies;
    private readonly _channels: OwnChannelRegistry<OwnSocket>;

    constructor(dependencies: OwnSocketsDependencies) {
        this._dependencies = dependencies;
        this._channels = new OwnChannelRegistry({
            store: dependencies.store,
            kind: LIVE_CHANNEL_KIND.WebSocket,
            idPrefix: CHANNEL_PREFIX,
            now: () => dependencies.now(),
        });
    }

    startAsync(): Promise<void> {
        return this._dependencies.headerRules.startAsync();
    }

    async connectAsync(url: string, headers: HeaderEntry[]): Promise<Result<string>> {
        await this.startAsync();
        const ruleId = await this.addHeaderRuleAsync(url, headers);
        if (ruleId.hasErrors) {
            return ruleId;
        }

        const created = this.createSocket(url);
        if (created.hasErrors) {
            await this.removeHeaderRuleAsync(ruleId.value);

            return created;
        }

        const socket = created.value;
        const channel = this._channels.open(
            /* url: */ url,
            /* handle: */ {
                socket,
                ruleId: ruleId.value,
            },
        );
        this.listen(channel, socket);

        return Result.ok(channel.id);
    }

    send(channelId: string, text: string): Result<void> {
        const owned = this._channels.handleOf(channelId);
        if (owned == null || owned.socket.readyState !== OPEN_STATE) {
            return Result.fail("This socket isn't open.");
        }

        owned.socket.send(text);
        this.addMessage({
            channelId,
            direction: LIVE_MESSAGE_DIRECTION.Sent,
            data: text,
            opcode: TEXT_OPCODE,
        });

        return Result.done();
    }

    close(channelId: string): void {
        this._channels.handleOf(channelId)?.socket.close();
    }

    private createSocket(url: string): Result<WebSocket> {
        return Result.attempt(() => this._dependencies.createSocket(url), `Can't connect to ${url}`);
    }

    private listen(channel: LiveChannel, socket: WebSocket): void {
        socket.binaryType = 'arraybuffer';
        socket.addEventListener(
            /* type: */ 'message',
            /* listener: */ event => {
                const isText = typeof event.data === 'string';
                this.addMessage({
                    channelId: channel.id,
                    direction: LIVE_MESSAGE_DIRECTION.Received,
                    data: isText
                        ? event.data as string
                        : Base64Text.fromBytes(new Uint8Array(event.data as ArrayBuffer)),
                    opcode: isText ? TEXT_OPCODE : BINARY_OPCODE,
                });
            },
        );
        socket.addEventListener(
            /* type: */ 'close',
            /* listener: */ () => {
                const owned = this._channels.close(channel);
                if (owned != null) {
                    void this.removeHeaderRuleAsync(owned.ruleId);
                }
            },
        );
    }

    private addMessage({ channelId, direction, data, opcode }: AddMessageOptions): void {
        this._channels.addMessage({
            channelId,
            direction,
            data,
            size: opcode === BINARY_OPCODE ? ByteSize.ofBase64(data) : ByteSize.ofText(data),
            opcode,
            eventName: null,
            eventId: null,
            retry: null,
        });
    }

    private async addHeaderRuleAsync(url: string, headers: HeaderEntry[]): Promise<Result<number | null>> {
        if (headers.length === 0) {
            return Result.ok(null);
        }

        return this._dependencies.headerRules.addAsync(url, headers);
    }

    private async removeHeaderRuleAsync(ruleId: number | null): Promise<void> {
        if (ruleId != null) {
            await this._dependencies.headerRules.removeAsync(ruleId);
        }
    }
}
