import { ActiveProfile } from "../../../Common/Profiles/ActiveProfile";
import { ViewId } from "../../Core/ViewId";
import { ClientView } from "../Client/ClientView";
import { CookiesView } from "../Cookies/CookiesView";
import { JwtView } from "../Jwt/JwtView";
import { RulesView } from "../Rules/RulesView";
import { TrafficView } from "../Traffic/TrafficView";
import type { ViewDefinition } from "./ViewDefinition";

function countBadge(count: number): string {
    return count === 0 ? "" : String(count);
}

export const ViewDefinitions: ViewDefinition[] = [
    {
        id: ViewId.Traffic,
        label: "Traffic",
        badgeOf: state => countBadge(state.entries.length),
        create: context => new TrafficView(context).root,
    },
    {
        id: ViewId.Rules,
        label: "Rules",
        badgeOf: state => countBadge(ActiveProfile
            .rules(state.settings)
            .filter(rule => rule.enabled)
            .length),
        create: context => new RulesView(context).root,
    },
    {
        id: ViewId.CookieJar,
        label: "Cookie Jar",
        badgeOf: () => "",
        create: context => new CookiesView(context).root,
    },
    {
        id: ViewId.Client,
        label: "Client",
        badgeOf: () => "",
        create: context => new ClientView(context).root,
    },
    {
        id: ViewId.Jwt,
        label: "JWT",
        badgeOf: () => "",
        create: context => new JwtView(context).root,
    },
];
