import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import type { RuleContext } from "../../Context/RuleContext";
import type { RequestDraft } from "../../Drafts/Drafts";
import { CookieHeader } from "../../Http/CookieHeader";
import { HeaderList } from "../../Http/HeaderList";
import { ActionReader } from "../ActionReader";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { OperationHint, OperationKinds, OperationOptions } from "../OperationKinds";
import { RuleChecks } from "../RuleChecks";
import { RuleTypeBase } from "../RuleTypeBase";

const CookieHeaderName = "Cookie";

type CookieApplier = (
    header: string | null,
    name: string,
    value: string
) => string;

const CookieAppliers: Record<string, CookieApplier> = {
    [OperationKinds.Add]: (
        header,
        name,
        value
    ) => CookieHeader.append(
        header,
        name,
        value
    ),
    [OperationKinds.AddIfMissing]: (
        header,
        name,
        value
    ) => CookieHeader.valuesOf(header, name).length > 0
        ? CookieHeader.serialize(CookieHeader.parse(header))
        : CookieHeader.append(
            header,
            name,
            value
        ),
    [OperationKinds.AddOrUpdate]: (
        header,
        name,
        value
    ) => CookieHeader.set(
        header,
        name,
        value
    ),
    [OperationKinds.Remove]: (header, name) => CookieHeader.remove(header, name),
};

interface RequestCookieAction {
    op: string;
    name: string;
    value: string;
}

export class RequestCookieRule extends RuleTypeBase<RequestCookieAction> {
    readonly id = RuleTypeIds.RequestCookie;
    readonly category = RuleCategory.Cookies;
    readonly label = "Request cookie";
    readonly description = "Add, update or remove one cookie in the Cookie header.";
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Select,
            key: "op",
            label: "Operation",
            hint: OperationHint,
            options: OperationOptions,
        },
        {
            kind: FieldKind.Text,
            key: "name",
            label: "Cookie name",
        },
        {
            kind: FieldKind.Text,
            key: "value",
            label: "Value",
            hint: "Can use {{variables}}.",
            visibleWhen: action => action["op"] !== OperationKinds.Remove,
        },
    ];

    protected defaults(): RequestCookieAction {
        return {
            op: OperationKinds.AddOrUpdate,
            name: "",
            value: "",
        };
    }

    protected read(action: RuleAction): RequestCookieAction {
        return {
            op: ActionReader.text(
                action,
                "op",
                OperationKinds.AddOrUpdate
            ),
            name: ActionReader.text(action, "name"),
            value: ActionReader.text(action, "value"),
        };
    }

    protected describe(action: RequestCookieAction): string {
        return action.op === OperationKinds.Remove ? `remove ${action.name}` : `${action.name}=${action.value}`;
    }

    override withoutSecrets(action: RuleAction): RuleAction {
        return {
            ...action,
            value: "",
        };
    }

    protected override check(action: RequestCookieAction): string[] {
        return RuleChecks.required(action.name, "Cookie name");
    }

    protected override onRequest(
        draft: RequestDraft,
        action: RequestCookieAction,
        context: RuleContext
    ): RequestDraft {
        const current = HeaderList.first(draft.headers, CookieHeaderName);
        const applier = CookieAppliers[action.op] ?? CookieAppliers[OperationKinds.AddOrUpdate]!;
        const updated = applier(
            current,
            action.name,
            context.render(action.value)
        );
        const headers = updated === ""
            ? HeaderList.remove(draft.headers, CookieHeaderName)
            : HeaderList.set(
                draft.headers,
                CookieHeaderName,
                updated
            );

        return {
            ...draft,
            headers,
        };
    }
}
