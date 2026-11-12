import { HeaderLookup } from "../../../Common/Http/HeaderLookup";
import { JwtToken } from "../../../Common/Jwt/JwtToken";
import { CookieHeader } from "../../../Common/Rules/Http/CookieHeader";
import { HeaderNames } from "../../../Contracts/Http/HeaderNames";
import { ChangeArea } from "../../../Contracts/Rules/ValueChange";
import { SearchFields } from "../../../Contracts/Search/SearchQuery";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { InspectorTabId } from "../../Core/InspectorTabId";
import type { PanelState } from "../../Core/PanelState";
import type { PanelContext } from "../Shell/PanelContext";
import { type DefinitionAction, DetailSections } from "./DetailSections";
import type { IInspectorTab } from "./IInspectorTab";

const CookieHeaderName = "Cookie";
const OpenIcon = "↗";

export class RequestHeadersTab implements IInspectorTab {
    readonly id = InspectorTabId.RequestHeaders;
    readonly label = "Request Headers";
    readonly searchFields = [SearchFields.RequestHeaders];

    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    keyOf(state: PanelState): string {
        return String(state.detailVersion);
    }

    render(detail: TimelineEntryDetail): HTMLElement {
        return buildElement("div", {
            className: "headers-tab",
            children: [
                DetailSections.headers(
                    detail.requestHeaders,
                    detail.changes,
                    ChangeArea.RequestHeader,
                    header => this.jwtActionOf(header)
                ),
                DetailSections.cookies(CookieHeader.parse(HeaderLookup.find(detail.requestHeaders, CookieHeaderName))),
            ],
        });
    }

    private jwtActionOf(header: HeaderEntry): DefinitionAction | undefined {
        const isAuthorization = header.name.toLowerCase() === HeaderNames.Authorization.toLowerCase();
        if (!isAuthorization || !JwtToken.looksLike(header.value)) {
            return undefined;
        }

        return {
            label: "Open in the JWT tab",
            icon: OpenIcon,
            run: () => this._context.viewLauncher.openJwt(header.value),
        };
    }
}
