import { ContentKindClassifier, type IContentKindClassifier } from "../../../Common/Content/ContentKindClassifier";
import { HarReader, HarTabId } from "../../../Common/Har/HarReader";
import { InspectionState } from "../../../Contracts/Inspection/InspectionState";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { FileClient, type IFileClient } from "../../Core/FileClient";
import { CountText } from "../../Core/Formatting/CountText";
import type { PanelState } from "../../Core/PanelState";
import { PanelStateFactory } from "../../Core/PanelStateFactory";
import { Store } from "../../Core/Store";
import { TrafficFeatureSets } from "../../Core/TrafficFeatures";
import { ViewId } from "../../Core/ViewId";
import { EntryDetailLoader } from "../Inspector/EntryDetailLoader";
import type { PanelContext } from "../Shell/PanelContext";
import { TimelineSync } from "../Traffic/TimelineSync";
import { TrafficSearch } from "../Traffic/TrafficSearch";
import { TrafficView } from "../Traffic/TrafficView";
import { HarConnection } from "./HarConnection";

const HarAccept = ".har,application/json";
const DraggingClass = "drag-over";
const HarUrlPrefix = "har:";
const OpenText = "Open .har";
const PastedName = "Pasted HAR";
const EditableSelector = "input, textarea, select, [contenteditable]";

export class HarInspectorView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _fileClient: IFileClient;
    private readonly _classifier: IContentKindClassifier;
    private readonly _body: HTMLElement;
    private readonly _fileLabel: HTMLElement;
    private readonly _closeButton: HTMLButtonElement;

    constructor(
        context: PanelContext,
        fileClient: IFileClient = new FileClient(),
        classifier: IContentKindClassifier = new ContentKindClassifier()
    ) {
        this._context = context;
        this._fileClient = fileClient;
        this._classifier = classifier;
        this._body = buildElement("div", {
            className: "har-body",
        });
        this._fileLabel = buildElement("span", {
            className: "muted har-file-name",
        });
        this._closeButton = FormControls.button({
            text: "Close file",
            variant: ButtonVariants.Ghost,
            onClick: () => this.showEmpty(),
        });

        this.root = buildElement("section", {
            className: "har-view",
            children: [
                buildElement("div", {
                    className: "view-header har-header",
                    children: [
                        buildElement("h2", {
                            text: "HAR Inspector",
                        }),
                        buildElement("div", {
                            className: "actions",
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
            text: OpenText,
            variant: ButtonVariants.Primary,
            onClick: () => void this.pick(),
        });
    }

    private async pick(): Promise<void> {
        const picked = await this._fileClient.pickNamedText(HarAccept);
        if (picked.hasErrors) {
            this._context.notifier.show(picked.error);

            return;
        }

        if (picked.value !== null) {
            this.open(picked.value.name, picked.value.text);
        }
    }

    private listenForDrops(): void {
        this.root.addEventListener("dragover", event => {
            event.preventDefault();
            this.root.classList.add(DraggingClass);
        });
        this.root.addEventListener("dragleave", () => this.root.classList.remove(DraggingClass));
        this.root.addEventListener("drop", event => {
            event.preventDefault();
            this.root.classList.remove(DraggingClass);
            const file = event.dataTransfer?.files[0];
            if (file === undefined) {
                return;
            }

            void file
                .text()
                .then(text => this.open(file.name, text));
        });
    }

    private listenForPastes(): void {
        document.addEventListener("paste", event => {
            const isActive = this._context.store.getState().activeView === ViewId.HarInspector;
            const isEditing = event.target instanceof Element && event.target.closest(EditableSelector) !== null;
            const text = event.clipboardData?.getData("text") ?? "";
            if (!isActive || isEditing || text.trim() === "") {
                return;
            }

            event.preventDefault();
            this.open(PastedName, text);
        });
    }

    private showEmpty(): void {
        this._fileLabel.textContent = "";
        this._closeButton.hidden = true;
        this._body.replaceChildren(buildElement("div", {
            className: "drop-zone",
            children: [
                buildElement("p", {
                    className: "drop-title",
                    text: "Drop a .har file here, or paste one",
                }),
                buildElement("p", {
                    className: "muted",
                    text: "Ctrl+V opens HAR text, such as one copied from Traffic.",
                }),
                buildElement("p", {
                    className: "muted",
                    text: "It opens in this tab only. Traffic, rules and the timeline stay as they are.",
                }),
            ],
        }));
    }

    private show(fileName: string, details: TimelineEntryDetail[]): void {
        const store = new Store<PanelState>({
            ...PanelStateFactory.initial(),
            inspectedTab: {
                tabId: HarTabId,
                url: `${HarUrlPrefix}${fileName}`,
                title: fileName,
            },
            inspection: {
                state: InspectionState.Attached,
                message: "",
            },
            entries: details.map(detail => detail.summary),
            trafficLayout: this._context.store.getState().trafficLayout,
        });
        const connection = new HarConnection(details);
        const harContext: PanelContext = {
            ...this._context,
            store,
            connection,
            timelineSync: new TimelineSync(store, connection),
            trafficSearch: new TrafficSearch(store, connection),
            trafficFeatures: TrafficFeatureSets.HarFile,
        };
        harContext.trafficSearch.start();
        new EntryDetailLoader(store, connection).start();

        const entryCount = CountText.of(
            details.length,
            "entry",
            "entries"
        );
        this._fileLabel.textContent = `${fileName} · ${entryCount}`;
        this._closeButton.hidden = false;
        this._body.replaceChildren(new TrafficView(harContext).root);
    }
}
