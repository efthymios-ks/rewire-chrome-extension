import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import type { HeaderEntry } from "../../../../Contracts/Timeline/HeaderEntry";
import type { RuleContext } from "../../Context/RuleContext";
import type { ResponseDraft } from "../../Drafts/Drafts";
import { HeaderList } from "../../Http/HeaderList";
import { type SetCookie, SetCookieHeader } from "../../Http/SetCookieHeader";
import { ActionReader } from "../ActionReader";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { OperationHint, OperationKinds, OperationOptions } from "../OperationKinds";
import { RuleChecks } from "../RuleChecks";
import { type ResponseArguments, RuleTypeBase } from "../RuleTypeBase";

const SetCookieName = "Set-Cookie";

interface ResponseCookieAction {
    op: string;
    name: string;
    value: string;
    domain: string;
    path: string;
    maxAge: string;
    sameSite: string;
    secure: boolean;
    httpOnly: boolean;
}

function isNamed(header: HeaderEntry, name: string): boolean {
    return header.name.toLowerCase() === SetCookieName.toLowerCase()
        && SetCookieHeader.parse(header.value).name === name;
}

function cookieOf(action: ResponseCookieAction, context: RuleContext): SetCookie {
    return {
        ...SetCookieHeader.empty(action.name, context.render(action.value)),
        domain: action.domain,
        path: action.path,
        maxAge: action.maxAge,
        sameSite: action.sameSite,
        secure: action.secure,
        httpOnly: action.httpOnly,
    };
}

function updated(
    existing: SetCookie,
    action: ResponseCookieAction,
    context: RuleContext
): SetCookie {
    return {
        ...existing,
        value: action.value === "" ? existing.value : context.render(action.value),
        domain: action.domain || existing.domain,
        path: action.path || existing.path,
        maxAge: action.maxAge || existing.maxAge,
        sameSite: action.sameSite || existing.sameSite,
        secure: action.secure || existing.secure,
        httpOnly: action.httpOnly || existing.httpOnly,
    };
}

interface CookieApplier {
    op: string;
    apply(
        headers: HeaderEntry[],
        action: ResponseCookieAction,
        context: RuleContext
    ): HeaderEntry[];
}

function added(
    headers: HeaderEntry[],
    action: ResponseCookieAction,
    context: RuleContext
): HeaderEntry[] {
    return HeaderList.append(
        headers,
        SetCookieName,
        SetCookieHeader.serialize(cookieOf(action, context))
    );
}

function hasNamed(headers: HeaderEntry[], name: string): boolean {
    return headers.some(header => isNamed(header, name));
}

const CookieAppliers: CookieApplier[] = [
    {
        op: OperationKinds.Add,
        apply: added,
    },
    {
        op: OperationKinds.AddIfMissing,
        apply: (
            headers,
            action,
            context
        ) => hasNamed(headers, action.name)
            ? headers
            : added(
                headers,
                action,
                context
            ),
    },
    {
        op: OperationKinds.AddOrUpdate,
        apply: (
            headers,
            action,
            context
        ) => !hasNamed(headers, action.name)
            ? added(
                headers,
                action,
                context
            )
            : headers.map(header => !isNamed(header, action.name)
                ? header
                : {
                    ...header,
                    value: SetCookieHeader.serialize(updated(
                        SetCookieHeader.parse(header.value),
                        action,
                        context
                    )),
                }),
    },
    {
        op: OperationKinds.Remove,
        apply: (headers, action) => headers.filter(header => !isNamed(header, action.name)),
    },
];

export class ResponseCookieRule extends RuleTypeBase<ResponseCookieAction> {
    readonly id = RuleTypeIds.ResponseCookie;
    readonly category = RuleCategory.Cookies;
    readonly label = "Response cookie";
    readonly description = "Add, update or remove a Set-Cookie with all its attributes.";
    override readonly handlesResponse = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Select,
            key: "op",
            label: "Operation",
            hint: `${OperationHint} Add or update keeps the attributes you leave empty.`,
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
            hint: "Empty keeps the server's value when changing.",
            visibleWhen: action => action["op"] !== OperationKinds.Remove,
        },
        {
            kind: FieldKind.Text,
            key: "domain",
            label: "Domain",
            visibleWhen: action => action["op"] !== OperationKinds.Remove,
        },
        {
            kind: FieldKind.Text,
            key: "path",
            label: "Path",
            placeholder: "/",
            visibleWhen: action => action["op"] !== OperationKinds.Remove,
        },
        {
            kind: FieldKind.Text,
            key: "maxAge",
            label: "Max-Age (seconds)",
            visibleWhen: action => action["op"] !== OperationKinds.Remove,
        },
        {
            kind: FieldKind.Select,
            key: "sameSite",
            label: "SameSite",
            options: [
                {
                    value: "",
                    label: "Not set",
                },
                {
                    value: "Lax",
                    label: "Lax",
                },
                {
                    value: "Strict",
                    label: "Strict",
                },
                {
                    value: "None",
                    label: "None",
                },
            ],
            visibleWhen: action => action["op"] !== OperationKinds.Remove,
        },
        {
            kind: FieldKind.Checkbox,
            key: "secure",
            label: "Secure",
            visibleWhen: action => action["op"] !== OperationKinds.Remove,
        },
        {
            kind: FieldKind.Checkbox,
            key: "httpOnly",
            label: "HttpOnly",
            visibleWhen: action => action["op"] !== OperationKinds.Remove,
        },
    ];

    protected defaults(): ResponseCookieAction {
        return {
            op: OperationKinds.AddOrUpdate,
            name: "",
            value: "",
            domain: "",
            path: "/",
            maxAge: "",
            sameSite: "",
            secure: false,
            httpOnly: false,
        };
    }

    protected read(action: RuleAction): ResponseCookieAction {
        return {
            op: ActionReader.text(
                action,
                "op",
                OperationKinds.AddOrUpdate
            ),
            name: ActionReader.text(action, "name"),
            value: ActionReader.text(action, "value"),
            domain: ActionReader.text(action, "domain"),
            path: ActionReader.text(action, "path"),
            maxAge: ActionReader.text(action, "maxAge"),
            sameSite: ActionReader.text(action, "sameSite"),
            secure: ActionReader.bool(
                action,
                "secure",
                false
            ),
            httpOnly: ActionReader.bool(
                action,
                "httpOnly",
                false
            ),
        };
    }

    override withoutSecrets(action: RuleAction): RuleAction {
        return {
            ...action,
            value: "",
        };
    }

    protected describe(action: ResponseCookieAction): string {
        return `${action.op} Set-Cookie ${action.name}`;
    }

    protected override check(action: ResponseCookieAction): string[] {
        return RuleChecks.required(action.name, "Cookie name");
    }

    protected override onResponse(args: ResponseArguments<ResponseCookieAction>): ResponseDraft {
        const applier = CookieAppliers.find(candidate => candidate.op === args.action.op) ?? CookieAppliers.find(candidate => candidate.op === OperationKinds.AddOrUpdate)!;

        return {
            ...args.draft,
            headers: applier.apply(
                args.draft.headers,
                args.action,
                args.context
            ),
        };
    }
}
