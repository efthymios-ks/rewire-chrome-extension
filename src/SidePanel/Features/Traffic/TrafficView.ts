import { buildElement } from '../../Core/Dom/buildElement';
import { TRAFFIC_LAYOUT } from '../../Core/TrafficLayout';
import { InspectorPanel } from '../Inspector/InspectorPanel';
import type { PanelContext } from '../Shell/PanelContext';
import { PinnedShelf } from './PinnedShelf';
import { SplitPane } from './SplitPane';
import { TimelineList } from './TimelineList';
import { TrafficSearchBar } from './TrafficSearchBar';
import { TrafficToolbar } from './TrafficToolbar';
import { WaterfallView } from './WaterfallView';

const NO_SELECTIONS = 0;

export class TrafficView {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        const list = new TimelineList(context).root;
        const waterfall = new WaterfallView(context).root;
        const splitPane = new SplitPane(
            /* first: */ buildElement('div', {
                className: 'traffic-main',
                children: [
                    list,
                    waterfall,
                ],
            }),
            /* second: */ new InspectorPanel(context).root,
        );

        this.root = buildElement('section', {
            className: 'traffic-view',
            children: [
                new PinnedShelf(context).root,
                new TrafficToolbar({ context }).root,
                new TrafficSearchBar(context).root,
                splitPane.root,
            ],
        });

        context.store.select({
            selector: state => state.selectionCount,
            listener: count => {
                if (count > NO_SELECTIONS) {
                    splitPane.expand();
                }
            },
        });

        context.store.select({
            selector: state => state.trafficLayout,
            listener: layout => {
                list.hidden = layout !== TRAFFIC_LAYOUT.List;
                waterfall.hidden = layout !== TRAFFIC_LAYOUT.Waterfall;
            },
        });
    }
}
