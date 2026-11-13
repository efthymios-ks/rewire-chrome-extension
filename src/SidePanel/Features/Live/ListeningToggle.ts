import { Result } from "../../../Common/Results/Result";
import type { LiveListening, LiveListeningKind } from "../../../Contracts/Live/LiveListening";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import { FormControls } from "../../Core/Dom/FormControls";
import type { PanelState } from "../../Core/PanelState";
import type { Store } from "../../Core/Store";
import type { IWorkerConnection } from "../../Core/WorkerConnection";
import type { PanelContext } from "../Shell/PanelContext";

interface ToggleText {
    label: string;
    title: string;
}

const ToggleTexts: Record<keyof LiveListening, ToggleText> = {
    webSockets: {
        label: "Listen to page sockets",
        title: "Capture the WebSockets of the inspected tab and its iframes. Your own sockets work either way.",
    },
    eventStreams: {
        label: "Listen to page streams",
        title: "Capture the event streams of the inspected tab and its iframes. Your own streams work either way.",
    },
    postMessages: {
        label: "Listen to page messages",
        title: "Capture the postMessage messages between the inspected tab and its iframes.",
    },
};

export const ListeningToggle = {
    build(context: PanelContext, kind: LiveListeningKind): HTMLLabelElement {
        const text = ToggleTexts[kind];
        const toggle = FormControls.toggleSwitch({
            checked: context.store.getState().liveListening[kind],
            label: text.label,
            className: "switch listening-toggle",
            onChange: isOn => void ListeningToggle.set(
                context,
                kind,
                isOn
            ),
        });
        toggle.title = text.title;
        const input = toggle.querySelector("input")!;
        context.store.select(
            state => state.liveListening[kind],
            isOn => {
                input.checked = isOn;
            }
        );

        return toggle;
    },

    async set(
        context: PanelContext,
        kind: LiveListeningKind,
        isOn: boolean
    ): Promise<void> {
        context.store.update(state => ({
            ...state,
            liveListening: {
                ...state.liveListening,
                [kind]: isOn,
            },
        }));
        const sent = await ListeningToggle.send(context.store, context.connection);
        if (sent.hasErrors) {
            context.notifier.show(sent.error);
        }
    },

    async send(store: Store<PanelState>, connection: IWorkerConnection): Promise<Result<void>> {
        const { inspectedTab, liveListening } = store.getState();
        if (inspectedTab === null) {
            return Result.done();
        }

        return connection.send<PanelCommandType.SetLiveListening>({
            type: PanelCommandType.SetLiveListening,
            tabId: inspectedTab.tabId,
            listening: liveListening,
        });
    },
};
