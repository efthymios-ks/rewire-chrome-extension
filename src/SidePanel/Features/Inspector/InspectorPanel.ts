import { buildElement } from "../../Core/Dom/ElementBuilder";
import { EmptyState } from "../../Core/Dom/EmptyState";
import { RenderScheduler } from "../../Core/Dom/RenderScheduler";
import type { PanelState } from "../../Core/PanelState";
import type { PanelContext } from "../Shell/PanelContext";
import { CodeTab } from "./CodeTab";
import { DiffTab } from "./DiffTab";
import type { IInspectorTab } from "./IInspectorTab";
import { OverviewTab } from "./OverviewTab";

const NoSelectionKey = "none";

export class InspectorPanel {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _tabs: IInspectorTab[];
    private readonly _tabButtons: HTMLButtonElement[];
    private readonly _body: HTMLElement;
    private readonly _scheduler = new RenderScheduler(() => this.render());
    private _renderedKey = "";

    constructor(context: PanelContext) {
        this._context = context;
        this._tabs = [
            new OverviewTab(context),
            new CodeTab(context),
            new DiffTab(),
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

        context.store.select(
            state => state,
            () => this._scheduler.schedule()
        );
    }

    private render(): void {
        const state = this._context.store.getState();
        const activeTab = this._tabs.find(tab => tab.id === state.inspectorTab) ?? this._tabs[0]!;
        this._tabs.forEach((tab, index) => this._tabButtons[index]?.setAttribute("aria-selected", String(tab === activeTab)));

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
