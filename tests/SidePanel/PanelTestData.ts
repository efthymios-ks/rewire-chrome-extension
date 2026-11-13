import { vi } from "vitest";
import { Result } from "../../src/Common/Results/Result";
import type { PanelCommand } from "../../src/Contracts/Messaging/PanelCommand";
import type { PanelCommandType } from "../../src/Contracts/Messaging/PanelCommandType";
import type { TimelineEntryDetail } from "../../src/Contracts/Timeline/TimelineEntryDetail";
import { Notifier } from "../../src/SidePanel/Core/Notifier";
import type { PanelState } from "../../src/SidePanel/Core/PanelState";
import { PanelStateFactory } from "../../src/SidePanel/Core/PanelStateFactory";
import { RuleEditorLauncher } from "../../src/SidePanel/Core/RuleEditorLauncher";
import { SettingsService } from "../../src/SidePanel/Core/SettingsService";
import { Store } from "../../src/SidePanel/Core/Store";
import { TrafficFeatureSets } from "../../src/SidePanel/Core/TrafficFeatures";
import { ViewLauncher } from "../../src/SidePanel/Core/ViewLauncher";
import type { IWorkerConnection } from "../../src/SidePanel/Core/WorkerConnection";
import type { PanelContext } from "../../src/SidePanel/Features/Shell/PanelContext";
import { TimelineSync } from "../../src/SidePanel/Features/Traffic/TimelineSync";
import { TrafficSearch } from "../../src/SidePanel/Features/Traffic/TrafficSearch";

const RenderWaitInMilliseconds = 40;

export interface PanelHarness {
    context: PanelContext;
    store: Store<PanelState>;
    sent: PanelCommand[];
    copied: string[];
    noticeText(): string;
}

export function aPanelHarness(
    state: Partial<PanelState> = {},
    detail: TimelineEntryDetail | null = null
): PanelHarness {
    const store = new Store<PanelState>({
        ...PanelStateFactory.initial(),
        ...state,
    });
    const sent: PanelCommand[] = [];
    const copied: string[] = [];
    const connection: IWorkerConnection = {
        send: vi.fn(async (command: PanelCommand) => {
            sent.push(command);

            return detail === null ? Result.done() : Result.ok(detail);
        }) as IWorkerConnection["send"],
        onEvent: vi.fn(),
        onReconnect: vi.fn(),
    };
    const notifier = new Notifier(store);
    const context: PanelContext = {
        store,
        settingsService: new SettingsService({
            store,
            storageClient: {
                load: vi.fn().mockResolvedValue(Result.ok(store.getState().settings)),
                save: vi.fn().mockResolvedValue(Result.done()),
                subscribe: vi.fn(),
            },
            notifier,
            logger: {
                warn: vi.fn(),
                error: vi.fn(),
            },
        }),
        timelineSync: new TimelineSync(store, connection),
        trafficSearch: new TrafficSearch(store, connection),
        connection,
        notifier,
        ruleEditor: new RuleEditorLauncher(store),
        viewLauncher: new ViewLauncher(store),
        clipboardClient: {
            copy: vi.fn(async (text: string) => {
                copied.push(text);

                return Result.done();
            }),
        },
        cookieClient: {
            list: vi.fn().mockResolvedValue(Result.ok([])),
            save: vi.fn().mockResolvedValue(Result.done()),
            remove: vi.fn().mockResolvedValue(Result.done()),
            subscribe: vi.fn(),
        },
        regexSupportClient: {
            check: vi.fn().mockResolvedValue(Result.done()),
        },
        trafficFeatures: TrafficFeatureSets.Live,
    };

    return {
        context,
        store,
        sent,
        copied,
        noticeText: () => store.getState().notice?.message ?? "",
    };
}

export function sentOf<TCommandType extends PanelCommandType>(harness: PanelHarness, type: TCommandType): PanelCommand[] {
    return harness.sent.filter(command => command.type === type);
}

export function nextRender(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, RenderWaitInMilliseconds));
}

export function typeInto(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event("input", {
        bubbles: true,
    }));
}

export function click(element: Element | null | undefined): void {
    (element as HTMLElement).click();
}

export function buttonNamed(root: ParentNode, text: string): HTMLButtonElement {
    const button = [...root.querySelectorAll("button")].find(candidate => candidate.textContent === text);
    if (button === undefined) {
        throw new Error(`No button named ${text}.`);
    }

    return button;
}
