import type { ContentKindClassifier } from '../../../Common/Content/ContentKindClassifier';
import { DefaultContentKindClassifier } from '../../../Common/Content/DefaultContentKindClassifier';
import { HarReader } from '../../../Common/Har/HarReader';
import { HAR_TAB_ID } from '../../../Common/Har/HarTabId';
import { Result } from '../../../Common/Results/Result';
import { INSPECTION_STATE } from '../../../Contracts/Inspection/InspectionState';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import { ChromeFileClient } from '../../Core/ChromeFileClient';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import type { FileClient } from '../../Core/FileClient';
import { CountText } from '../../Core/Formatting/CountText';
import type { PanelState } from '../../Core/PanelState';
import { PanelStateFactory } from '../../Core/PanelStateFactory';
import { Store } from '../../Core/Store';
import { TRAFFIC_FEATURE_SETS } from '../../Core/TrafficFeatureSets';
import { VIEW_ID } from '../../Core/ViewId';
import { EntryDetailLoader } from '../Inspector/EntryDetailLoader';
import type { PanelContext } from '../Shell/PanelContext';
import { TimelineSync } from '../Traffic/TimelineSync';
import { TrafficSearch } from '../Traffic/TrafficSearch';
import { TrafficView } from '../Traffic/TrafficView';
import { HarConnection } from './HarConnection';

const HAR_ACCEPT = '.har,application/json';
const DRAG_OVER_ATTRIBUTE = 'data-drag-over';
const HAR_URL_PREFIX = 'har:';
const OPEN_TEXT = 'Open .har';
const PASTED_NAME = 'Pasted HAR';
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]';

function readTextAsync(file: File): Promise<Result<string>> {
    return Result.attemptAsync(() => file.text(), `Can't read ${file.name}`);
}

export interface HarInspectorViewDependencies {
    context: PanelContext;
    fileClient?: FileClient;
    classifier?: ContentKindClassifier;
}

export class HarInspectorView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _fileClient: FileClient;
    private readonly _classifier: ContentKindClassifier;
    private readonly _body: HTMLElement;
    private readonly _fileLabel: HTMLElement;
    private readonly _closeButton: HTMLButtonElement;

    constructor({
        context,
        fileClient = new ChromeFileClient(),
        classifier = new DefaultContentKindClassifier(),
    }: HarInspectorViewDependencies) {
        this._context = context;
        this._fileClient = fileClient;
        this._classifier = classifier;
        this._body = buildElement('div', {
            className: 'har-body',
        });
        this._fileLabel = buildElement('span', {
            className: 'har-file-name',
        });
        this._closeButton = FormControls.button({
            text: 'Close file',
            variant: BUTTON_VARIANTS.Ghost,
            onClick: () => this.showEmpty(),
        });

        this.root = buildElement('section', {
            className: 'har-view',
            children: [
                buildElement('div', {
                    className: 'view-header har-header',
                    children: [
                        buildElement('h2', {
                            text: 'HAR Inspector',
                        }),
                        buildElement('div', {
                            className: 'actions',
                            children: [
                                this._fileLabel,
                                this._closeButton,
                                this.openButton(),
                            ],
                        }),
                    ],
                }),
                this._body,
            ],
        });
        this.listenForDrops();
        this.listenForPastes();
        this.showEmpty();
    }

    open(fileName: string, text: string): void {
        const read = HarReader.read(text, this._classifier);
        if (read.hasErrors) {
            this._context.notifier.show(`Can't open ${fileName}: ${read.error}.`);

            return;
        }

        this.show(fileName, read.value);
    }

    private openButton(): HTMLButtonElement {
        return FormControls.button({
            text: OPEN_TEXT,
            variant: BUTTON_VARIANTS.Primary,
            onClick: () => void this.pickAsync(),
        });
    }

    private async pickAsync(): Promise<void> {
        const picked = await this._fileClient.pickNamedTextAsync(HAR_ACCEPT);
        if (picked.hasErrors) {
            this._context.notifier.show(picked.error);

            return;
        }

        if (picked.value != null) {
            this.open(picked.value.name, picked.value.text);
        }
    }

    private listenForDrops(): void {
        this.root.addEventListener(
            /* type: */ 'dragover',
            /* listener: */ event => {
                event.preventDefault();
                this.root.toggleAttribute(DRAG_OVER_ATTRIBUTE, true);
            },
        );
        this.root.addEventListener(
            /* type: */ 'dragleave',
            /* listener: */ () => this.root.toggleAttribute(DRAG_OVER_ATTRIBUTE, false),
        );
        this.root.addEventListener(
            /* type: */ 'drop',
            /* listener: */ event => {
                event.preventDefault();
                this.root.toggleAttribute(DRAG_OVER_ATTRIBUTE, false);
                const file = event.dataTransfer?.files[0];
                if (file != null) {
                    void this.openDroppedAsync(file);
                }
            },
        );
    }

    private async openDroppedAsync(file: File): Promise<void> {
        const text = await readTextAsync(file);
        if (text.hasErrors) {
            this._context.notifier.show(text.error);

            return;
        }

        this.open(file.name, text.value);
    }

    private listenForPastes(): void {
        document.addEventListener(
            /* type: */ 'paste',
            /* listener: */ event => {
                const isActive = this._context.store.getState().activeView === VIEW_ID.HarInspector;
                const isEditing = event.target instanceof Element
                    && event.target.closest(EDITABLE_SELECTOR) != null;
                const text = event.clipboardData?.getData('text') ?? '';
                if (
                    !isActive
                    || isEditing
                    || text.trim() === ''
                ) {
                    return;
                }

                event.preventDefault();
                this.open(PASTED_NAME, text);
            },
        );
    }

    private showEmpty(): void {
        this._fileLabel.textContent = '';
        this._closeButton.hidden = true;
        this._body.replaceChildren(buildElement('div', {
            className: 'drop-zone',
            children: [
                buildElement('p', {
                    className: 'drop-title',
                    text: 'Drop a .har file here, or paste one',
                }),
                buildElement('p', {
                    className: 'help-text',
                    text: 'Ctrl+V opens HAR text, such as one copied from Traffic.',
                }),
                buildElement('p', {
                    className: 'help-text',
                    text: 'It opens in this tab only. Traffic, rules and the timeline stay as they are.',
                }),
            ],
        }));
    }

    private show(fileName: string, details: TimelineEntryDetail[]): void {
        const store = new Store<PanelState>({
            ...PanelStateFactory.initial(),
            inspectedTab: {
                tabId: HAR_TAB_ID,
                url: `${HAR_URL_PREFIX}${fileName}`,
                title: fileName,
            },
            inspection: {
                state: INSPECTION_STATE.Attached,
                message: '',
            },
            entries: details.map(detail => detail.summary),
            trafficLayout: this._context.store.getState().trafficLayout,
        });
        const connection = new HarConnection(details);
        const harContext: PanelContext = {
            ...this._context,
            store,
            connection,
            timelineSync: new TimelineSync({
                store,
                connection,
                notifier: this._context.notifier,
            }),
            trafficSearch: new TrafficSearch(store, connection),
            trafficFeatures: TRAFFIC_FEATURE_SETS.HarFile,
        };
        harContext.trafficSearch.start();
        new EntryDetailLoader(store, connection).start();

        const entryCount = CountText.of({ count: details.length, singular: 'entry', plural: 'entries' });
        this._fileLabel.textContent = `${fileName} · ${entryCount}`;
        this._closeButton.hidden = false;
        this._body.replaceChildren(new TrafficView(harContext).root);
    }
}
