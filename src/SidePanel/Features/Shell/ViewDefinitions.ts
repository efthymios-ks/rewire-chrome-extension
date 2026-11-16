import { ActiveProfile } from '../../../Common/Profiles/ActiveProfile';
import { LIVE_CHANNEL_KIND, type LiveChannelKind } from '../../../Contracts/Live/LiveChannelKind';
import type { PanelState } from '../../Core/PanelState';
import { VIEW_ID } from '../../Core/ViewId';
import { ClientView } from '../Client/ClientView';
import { CookiesView } from '../Cookies/CookiesView';
import { HarInspectorView } from '../HarInspector/HarInspectorView';
import { JwtView } from '../Jwt/JwtView';
import { PostMessageView } from '../PostMessages/PostMessageView';
import { RulesView } from '../Rules/RulesView';
import { SseClientView } from '../SseClient/SseClientView';
import { TrafficView } from '../Traffic/TrafficView';
import { WsClientView } from '../WsClient/WsClientView';
import type { ViewDefinition } from './ViewDefinition';

function countBadge(count: number): string {
    return count === 0 ? '' : String(count);
}

function openChannelsBadge(state: PanelState, kind: LiveChannelKind): string {
    return countBadge(state.live.channels
        .filter(channel => channel.kind === kind && channel.isOpen)
        .length);
}

export const VIEW_DEFINITIONS: ViewDefinition[] = [
    {
        id: VIEW_ID.Traffic,
        label: 'Traffic',
        badgeOf: state => countBadge(state.entries.length),
        create: context => new TrafficView(context).root,
    },
    {
        id: VIEW_ID.Rules,
        label: 'Rules',
        badgeOf: state => countBadge(ActiveProfile
            .rules(state.settings)
            .filter(rule => rule.enabled)
            .length),
        create: context => new RulesView(context).root,
    },
    {
        id: VIEW_ID.CookieJar,
        label: 'Cookie Jar',
        badgeOf: () => '',
        create: context => new CookiesView(context).root,
    },
    {
        id: VIEW_ID.Jwt,
        label: 'JWT',
        badgeOf: () => '',
        create: context => new JwtView(context).root,
    },
    {
        id: VIEW_ID.Client,
        label: 'HTTP Client',
        badgeOf: () => '',
        create: context => new ClientView(context).root,
    },
    {
        id: VIEW_ID.WsClient,
        label: 'WS Client',
        badgeOf: state => openChannelsBadge(state, LIVE_CHANNEL_KIND.WebSocket),
        create: context => new WsClientView(context).root,
    },
    {
        id: VIEW_ID.SseClient,
        label: 'SSE Client',
        badgeOf: state => openChannelsBadge(state, LIVE_CHANNEL_KIND.EventStream),
        create: context => new SseClientView(context).root,
    },
    {
        id: VIEW_ID.PostMessage,
        label: 'postMessage',
        badgeOf: state => countBadge(state.live.postMessages.length),
        create: context => new PostMessageView(context).root,
    },
    {
        id: VIEW_ID.HarInspector,
        label: 'HAR Inspector',
        badgeOf: () => '',
        create: context => new HarInspectorView({ context }).root,
    },
];
