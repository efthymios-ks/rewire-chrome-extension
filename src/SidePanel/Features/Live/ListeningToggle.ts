import { Result } from '../../../Common/Results/Result';
import type { LiveListening, LiveListeningKind } from '../../../Contracts/Live/LiveListening';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { FormControls } from '../../Core/Dom/FormControls';
import type { PanelState } from '../../Core/PanelState';
import type { Store } from '../../Core/Store';
import type { WorkerConnection } from '../../Core/WorkerConnection';
import type { PanelContext } from '../Shell/PanelContext';

interface ToggleText {
    label: string;
    title: string;
}

const TOGGLE_TEXTS: Record<keyof LiveListening, ToggleText> = {
    webSockets: {
        label: 'Listen to page sockets',
        title: 'Capture the WebSockets of the inspected tab and its iframes. Your own sockets work either way.',
    },
    eventStreams: {
        label: 'Listen to page streams',
        title: 'Capture the event streams of the inspected tab and its iframes. Your own streams work either way.',
    },
    postMessages: {
        label: 'Listen to page messages',
        title: 'Capture the postMessage messages between the inspected tab and its iframes.',
    },
};

export interface SetAsyncOptions {
    context: PanelContext;
    kind: LiveListeningKind;
    isOn: boolean;
}

export const ListeningToggle = {
    build(context: PanelContext, kind: LiveListeningKind): HTMLLabelElement {
        const text = TOGGLE_TEXTS[kind];
        const toggle = FormControls.toggleSwitch({
            checked: context.store.getState().liveListening[kind],
            label: text.label,
            className: 'switch listening-toggle',
            onChange: isOn => void ListeningToggle.setAsync({ context, kind, isOn }),
        });
        toggle.title = text.title;
        const input = toggle.querySelector('input')!;
        context.store.select({
            selector: state => state.liveListening[kind],
            listener: isOn => {
                input.checked = isOn;
            },
        });

        return toggle;
    },

    async setAsync({ context, kind, isOn }: SetAsyncOptions): Promise<void> {
        context.store.update(state => ({
            ...state,
            liveListening: {
                ...state.liveListening,
                [kind]: isOn,
            },
        }));
        const sent = await ListeningToggle.sendAsync(context.store, context.connection);
        if (sent.hasErrors) {
            context.notifier.show(sent.error);
        }
    },

    async sendAsync(store: Store<PanelState>, connection: WorkerConnection): Promise<Result<void>> {
        const { inspectedTab, liveListening } = store.getState();
        if (inspectedTab == null) {
            return Result.done();
        }

        return connection.sendAsync<typeof PANEL_COMMAND_TYPE.SetLiveListening>({
            type: PANEL_COMMAND_TYPE.SetLiveListening,
            tabId: inspectedTab.tabId,
            listening: liveListening,
        });
    },
};
