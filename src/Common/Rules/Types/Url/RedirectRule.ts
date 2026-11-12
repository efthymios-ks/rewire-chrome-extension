import type { RuleCriteria } from "../../../../Contracts/Rules/Criterion";
import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import type { RuleContext } from "../../Context/RuleContext";
import type { RequestDraft } from "../../Drafts/Drafts";
import { ActionReader } from "../ActionReader";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { RuleChecks } from "../RuleChecks";
import { RuleTypeBase } from "../RuleTypeBase";
import { RegexDestination } from "./RegexDestination";

interface RedirectStatusOption {
    code: number;
    label: string;
}

const RedirectStatusOptions: readonly RedirectStatusOption[] = [
    {
        code: 301,
        label: "301 Moved Permanently",
    },
    {
        code: 302,
        label: "302 Found",
    },
    {
        code: 303,
        label: "303 See Other",
    },
    {
        code: 307,
        label: "307 Temporary Redirect",
    },
    {
        code: 308,
        label: "308 Permanent Redirect",
    },
];

export const DefaultRedirectStatus = 308;

const TargetLabel = "Location URL";
const LocationHeader = "Location";

interface RedirectAction {
    target: string;
    status: number;
}

function statusOf(action: RuleAction): number {
    const status = Number(action["status"] ?? DefaultRedirectStatus);
    const codes: readonly number[] = RedirectStatusOptions.map(option => option.code);

    return codes.includes(status) ? status : DefaultRedirectStatus;
}

export class RedirectRule extends RuleTypeBase<RedirectAction> {
    readonly id = RuleTypeIds.Redirect;
    readonly category = RuleCategory.UrlAndRedirects;
    readonly label = "Redirect";
    readonly description = "Answer matching requests with an HTTP redirect (status + Location header). The browser follows it.";
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Text,
            key: "target",
            label: TargetLabel,
            placeholder: "https://example.com/$1",
            hint: "$1 to $9 insert the groups of a URL condition that matches a regex. Can use {{variables}}.",
        },
        {
            kind: FieldKind.Select,
            key: "status",
            label: "Status",
            options: RedirectStatusOptions.map(option => ({
                value: String(option.code),
                label: option.label,
            })),
        },
    ];

    protected defaults(): RedirectAction {
        return {
            target: "",
            status: DefaultRedirectStatus,
        };
    }

    protected read(action: RuleAction): RedirectAction {
        return {
            target: ActionReader.text(action, "target"),
            status: statusOf(action),
        };
    }

    protected describe(action: RedirectAction): string {
        return `${action.status} -> ${action.target}`;
    }

    protected override check(action: RedirectAction, criteria: RuleCriteria): string[] {
        const required = RuleChecks.required(action.target, TargetLabel);

        return required.length > 0 ? required : RegexDestination.groupErrorsOf(action.target, criteria);
    }

    protected override onRequest(
        draft: RequestDraft,
        action: RedirectAction,
        context: RuleContext,
        criteria: RuleCriteria
    ): RequestDraft {
        const url = RegexDestination.resolve(
            draft.url,
            context.render(action.target),
            criteria
        );
        if (url === null) {
            return draft;
        }

        return {
            ...draft,
            response: {
                status: action.status,
                headers: [
                    {
                        name: LocationHeader,
                        value: url,
                    },
                ],
                body: "",
            },
        };
    }
}
