import { ContextMenu } from "../../Core/Dom/ContextMenu";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { EmptyState } from "../../Core/Dom/EmptyState";
import { RenderScheduler } from "../../Core/Dom/RenderScheduler";
import type { PanelState } from "../../Core/PanelState";
import type { PanelContext } from "../Shell/PanelContext";
import { EntryContextMenu } from "../Traffic/EntryContextMenu";
import { CodeTab } from "./CodeTab";
import { GeneralTab } from "./GeneralTab";
import type { IInspectorTab } from "./IInspectorTab";
import { RequestBodyTab } from "./RequestBodyTab";
import { RequestHeadersTab } from "./RequestHeadersTab";
import { ResponseBodyTab } from "./ResponseBodyTab";
import { ResponseHeadersTab } from "./ResponseHeadersTab";

const NoSelectionKey = "none";
const MatchAttribute = "data-match";

export class InspectorPanel {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _tabs: IInspectorTab[];
    private readonly _tabButtons: HTMLButtonElement[];
    private readonly _body: HTMLElement;
    private readonly _scheduler = new RenderScheduler(() => this.render());
    private readonly _contextMenu = new ContextMenu();
    private readonly _entryMenu: EntryContextMenu;
    private _renderedKey = "";

    constructor(context: PanelContext) {
        this._context = context;
        this._entryMenu = new EntryContextMenu(context);
        this._tabs = [
            new GeneralTab(context),
            new RequestHeadersTab(context),
            new RequestBodyTab(context),
            new ResponseHeadersTab(),
            new ResponseBodyTab(context),
            new CodeTab(context),
        ];
        this._tabButtons = this._tabs.map(tab => buildElement("button", {
            className: "tab",
            text: tab.label,
            attributes: {
                type: "button",
                role: "tab",
            },
            listeners: {
                click: () => context.store.update(state => ({
                    ...state,
                    inspectorTab: tab.id,
                })),
            },
        }));
        this._body = buildElement("div", {
            className: "inspector-body",
        });
        this.root = buildElement("section", {
            className: "inspector",
            attributes: {
                "aria-label": "Request inspector",
            },
            children: [
                buildElement("nav", {
                    className: "inspector-tabs",
                    attributes: {
                        role: "tablist",
                    },
                    children: this._tabButtons,
                }),
                this._body,
            ],
        });

        this.root.addEventListener("contextmenu", event => this.onContextMenu(event));

        context.store.select(
            state => state,
            () => this._scheduler.schedule()
        );
    }

    private onContextMenu(event: MouseEvent): void {
        const state = this._context.store.getState();
        const summary = state.selectedEntryDetail?.summary ?? state.entries.find(entry => entry.id === state.selectedEntryId);
        const isEditable = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
        const hasSelection = (window.getSelection()?.toString() ?? "") !== "";
        if (summary === undefined || isEditable || hasSelection) {
            return;
        }

        event.preventDefault();
        this._contextMenu.open(
            this._entryMenu.itemsFor(summary),
            event.clientX,
            event.clientY
        );
    }

    private render(): void {
        const state = this._context.store.getState();
        const activeTab = this._tabs.find(tab => tab.id === state.inspectorTab) ?? this._tabs[0]!;
        const matchedFields = state.search.matches.find(match => match.entryId === state.selectedEntryId)?.fields ?? [];
        this._tabs.forEach((tab, index) => {
            const button = this._tabButtons[index];
            button?.setAttribute("aria-selected", String(tab === activeTab));
            button?.toggleAttribute(MatchAttribute, tab.searchFields.some(field => matchedFields.includes(field)));
        });

        const key = this.keyOf(state, activeTab);
        if (key === this._renderedKey) {
            return;
        }

        this._renderedKey = key;
        this._body.replaceChildren(this.contentOf(state, activeTab));
    }

    private keyOf(state: PanelState, activeTab: IInspectorTab): string {
        const detail = state.selectedEntryDetail;
        if (state.selectedEntryId === null) {
            return NoSelectionKey;
        }

        if (detail === null || detail.summary.id !== state.selectedEntryId) {
            return `loading|${state.selectedEntryId}|${state.detailError ?? ""}`;
        }

        return `${activeTab.id}|${activeTab.keyOf(state, detail)}`;
    }

    private contentOf(state: PanelState, activeTab: IInspectorTab): HTMLElement {
        const detail = state.selectedEntryDetail;
        if (state.selectedEntryId === null) {
            return EmptyState.build("Pick a request to inspect it, turn it into code or mock it.");
        }

        if (state.detailError !== null) {
            return EmptyState.build(state.detailError);
        }

        if (detail === null || detail.summary.id !== state.selectedEntryId) {
            return EmptyState.build("Loading...");
        }

        return activeTab.render(detail, state);
    }
}
