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

export class ResponseBodyTab implements IInspectorTab {
    readonly id = InspectorTabId.ResponseBody;
    readonly label = "Response Body";
    readonly searchFields = [SearchFields.ResponseBody];

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
                    detail.responseBody,
                    "Copy response body"
                ),
                DetailSections.body(
                    detail.responseBody,
                    detail.responseBodyNote,
                    InspectorSearch.queryOf(state),
                    DetailSections.changeOf(
                        detail.changes,
                        ChangeArea.ResponseBody,
                        "body"
                    )
                ),
            ],
        });
    }
}
