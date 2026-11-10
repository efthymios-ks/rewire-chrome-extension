import { buildElement } from "../../Core/Dom/ElementBuilder";
import { TrafficLayout } from "../../Core/TrafficLayout";
import { InspectorPanel } from "../Inspector/InspectorPanel";
import type { PanelContext } from "../Shell/PanelContext";
import { PinnedShelf } from "./PinnedShelf";
import { SplitPane } from "./SplitPane";
import { TimelineList } from "./TimelineList";
import { TrafficSearchBar } from "./TrafficSearchBar";
import { TrafficToolbar } from "./TrafficToolbar";
import { WaterfallView } from "./WaterfallView";

const NoSelections = 0;

export class TrafficView {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        const list = new TimelineList(context).root;
        const waterfall = new WaterfallView(context).root;
        const splitPane = new SplitPane(
            buildElement("div", {
                className: "traffic-main",
                children: [
                    list,
                    waterfall,
                ],
            }),
            new InspectorPanel(context).root
        );

        this.root = buildElement("section", {
            className: "traffic-view",
            children: [
                new PinnedShelf(context).root,
                new TrafficToolbar(context).root,
                new TrafficSearchBar(context).root,
                splitPane.root,
            ],
        });

        context.store.select(
            state => state.selectionCount,
            count => {
                if (count > NoSelections) {
                    splitPane.expand();
                }
            }
        );

        context.store.select(
            state => state.trafficLayout,
            layout => {
                list.hidden = layout !== TrafficLayout.List;
                waterfall.hidden = layout !== TrafficLayout.Waterfall;
            }
        );
    }
}
