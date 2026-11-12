import { ChangeArea } from "../../../Contracts/Rules/ValueChange";
import { SearchFields } from "../../../Contracts/Search/SearchQuery";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { InspectorTabId } from "../../Core/InspectorTabId";
import type { PanelState } from "../../Core/PanelState";
import type { PanelContext } from "../Shell/PanelContext";
import { BodyCopyButton } from "./BodyCopyButton";
import { DetailSections } from "./DetailSections";
import type { IInspectorTab } from "./IInspectorTab";
import { InspectorSearch } from "./InspectorSearch";

export class RequestBodyTab implements IInspectorTab {
    readonly id = InspectorTabId.RequestBody;
    readonly label = "Request Body";
    readonly searchFields = [SearchFields.RequestBody];

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    keyOf(state: PanelState): string {
        return `${state.detailVersion}|${InspectorSearch.keyOf(state)}`;
    }

    render(detail: TimelineEntryDetail, state: PanelState): HTMLElement {
        return buildElement("div", {
            className: "body-tab",
            children: [
                BodyCopyButton.build(
                    this._context,
                    detail.requestBody,
                    "Copy request body"
                ),
                DetailSections.body(
                    detail.requestBody,
                    null,
                    InspectorSearch.queryOf(state),
                    DetailSections.changeOf(
                        detail.changes,
                        ChangeArea.RequestBody,
                        "body"
                    )
                ),
            ],
        });
    }
}
