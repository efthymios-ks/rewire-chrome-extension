import { vi } from 'vitest';
import { Result } from '../Common/Results/Result';
import type { PanelCommand } from '../Contracts/Messaging/PanelCommand';
import type { PanelCommandType } from '../Contracts/Messaging/PanelCommandType';
import { SEARCH_FIELDS } from '../Contracts/Search/SearchField';
import { SEARCH_SCOPES } from '../Contracts/Search/SearchScope';
import type { TimelineEntryDetail } from '../Contracts/Timeline/TimelineEntryDetail';
import type { FileClient } from './Core/FileClient';
import { Notifier } from './Core/Notifier';
import type { PanelState } from './Core/PanelState';
import { PanelStateFactory } from './Core/PanelStateFactory';
import { RuleEditorLauncher } from './Core/RuleEditorLauncher';
import { SettingsService } from './Core/SettingsService';
import { Store } from './Core/Store';
import { TRAFFIC_FEATURE_SETS } from './Core/TrafficFeatureSets';
import type { TrafficSearchState } from './Core/TrafficSearchState';
import { ViewLauncher } from './Core/ViewLauncher';
import type { WorkerConnection } from './Core/WorkerConnection';
import type { PanelContext } from './Features/Shell/PanelContext';
import { TimelineSync } from './Features/Traffic/TimelineSync';
import { TrafficSearch } from './Features/Traffic/TrafficSearch';

const RENDER_WAIT_IN_MILLISECONDS = 40;
const SEARCHED_TEXT = 'users';

export interface PanelHarness {
    context: PanelContext;
    store: Store<PanelState>;
    sent: PanelCommand[];
    copied: string[];
    noticeText(): string;
}

export function aPanelHarness(
    state: Partial<PanelState> = {},
    detail: TimelineEntryDetail | null = null,
): PanelHarness {
    const store = new Store<PanelState>({
        ...PanelStateFactory.initial(),
        ...state,
    });
    const sent: PanelCommand[] = [];
    const copied: string[] = [];
    const connection: WorkerConnection = {
        sendAsync: vi.fn(async (command: PanelCommand) => {
            sent.push(command);

            return detail == null ? Result.done() : Result.ok(detail);
        }) as WorkerConnection['sendAsync'],
        onEvent: vi.fn(),
        onReconnect: vi.fn(),
    };
    const notifier = new Notifier(store);
    const context: PanelContext = {
        store,
        settingsService: new SettingsService({
            store,
            storageClient: {
                loadAsync: vi.fn().mockResolvedValue(Result.ok(store.getState().settings)),
                saveAsync: vi.fn().mockResolvedValue(Result.done()),
                subscribe: vi.fn(),
            },
            notifier,
            logger: {
                warn: vi.fn(),
                error: vi.fn(),
            },
        }),
        timelineSync: new TimelineSync({
            store,
            connection,
            notifier,
        }),
        trafficSearch: new TrafficSearch(store, connection),
        connection,
        notifier,
        ruleEditor: new RuleEditorLauncher(store),
        viewLauncher: new ViewLauncher(store),
        clipboardClient: {
            copyAsync: vi.fn(async (text: string) => {
                copied.push(text);

                return Result.done();
            }),
        },
        cookieClient: {
            listAsync: vi.fn().mockResolvedValue(Result.ok([])),
            saveAsync: vi.fn().mockResolvedValue(Result.done()),
            removeAsync: vi.fn().mockResolvedValue(Result.done()),
            subscribe: vi.fn(),
        },
        regexSupportClient: {
            checkAsync: vi.fn().mockResolvedValue(Result.done()),
        },
        trafficFeatures: TRAFFIC_FEATURE_SETS.Live,
    };

    return {
        context,
        store,
        sent,
        copied,
        noticeText: () => store.getState().notice?.message ?? '',
    };
}

export function aFileClient(overrides: Partial<FileClient> = {}): FileClient {
    return {
        download: vi.fn(),
        pickTextAsync: vi.fn().mockResolvedValue(Result.ok(null)),
        pickNamedTextAsync: vi.fn().mockResolvedValue(Result.ok(null)),
        ...overrides,
    };
}

export function sentOf<TCommandType extends PanelCommandType>(
    harness: PanelHarness,
    type: TCommandType,
): PanelCommand[] {
    return harness.sent.filter(command => command.type === type);
}

export function aSearchMatching(
    entryIds: string[],
    overrides: Partial<TrafficSearchState> = {},
): TrafficSearchState {
    return {
        query: {
            text: SEARCHED_TEXT,
            isRegex: false,
            scopes: [SEARCH_SCOPES.Url],
        },
        searchedText: SEARCHED_TEXT,
        matches: entryIds.map(entryId => ({
            entryId,
            fields: [SEARCH_FIELDS.Url],
            count: 1,
        })),
        error: null,
        ...overrides,
    };
}

export function nextRenderAsync(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, RENDER_WAIT_IN_MILLISECONDS));
}

export function typeInto(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input', {
        bubbles: true,
    }));
}

export function click(element: Element | null | undefined): void {
    (element as HTMLElement).click();
}

export function fieldNamed(root: ParentNode, label: string): HTMLElement {
    const field = [...root.querySelectorAll<HTMLElement>('.field')]
        .find(candidate => candidate.querySelector('.field-label')?.textContent === label);
    if (field == null) {
        throw new Error(`No field labelled ${label}.`);
    }

    return field;
}

export function controlNamed<TControl extends HTMLElement>(root: ParentNode, label: string): TControl {
    const control = fieldNamed(root, label).querySelector<TControl>('input, select, textarea');
    if (control == null) {
        throw new Error(`No control in the field labelled ${label}.`);
    }

    return control;
}

export function buttonNamed(root: ParentNode, text: string): HTMLButtonElement {
    const button = [...root.querySelectorAll('button')].find(candidate => candidate.textContent === text);
    if (button == null) {
        throw new Error(`No button named ${text}.`);
    }

    return button;
}
