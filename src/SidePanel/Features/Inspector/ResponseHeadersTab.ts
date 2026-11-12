import { HeaderList } from "../../../Common/Rules/Http/HeaderList";
import { SetCookieHeader } from "../../../Common/Rules/Http/SetCookieHeader";
import { ChangeArea } from "../../../Contracts/Rules/ValueChange";
import { SearchFields } from "../../../Contracts/Search/SearchQuery";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { InspectorTabId } from "../../Core/InspectorTabId";
import type { PanelState } from "../../Core/PanelState";
import { DetailSections } from "./DetailSections";
import type { IInspectorTab } from "./IInspectorTab";

const SetCookieHeaderName = "Set-Cookie";

export class ResponseHeadersTab implements IInspectorTab {
    readonly id = InspectorTabId.ResponseHeaders;
    readonly label = "Response Headers";
    readonly searchFields = [SearchFields.ResponseHeaders];

    keyOf(state: PanelState): string {
        return String(state.detailVersion);
    }

    render(detail: TimelineEntryDetail): HTMLElement {
        return buildElement("div", {
            className: "headers-tab",
            children: [
                DetailSections.headers(
                    detail.responseHeaders,
                    detail.changes,
                    ChangeArea.ResponseHeader
                ),
                DetailSections.setCookies(HeaderList
                    .values(detail.responseHeaders, SetCookieHeaderName)
                    .map(value => SetCookieHeader.parse(value))),
            ],
        });
    }
}
