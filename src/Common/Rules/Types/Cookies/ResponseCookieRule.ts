import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import type { RuleContext } from '../../Context/RuleContext';
import type { ResponseDraft } from '../../Drafts/ResponseDraft';
import { HeaderList } from '../../Http/HeaderList';
import type { SetCookie } from '../../Http/SetCookie';
import { SetCookieHeader } from '../../Http/SetCookieHeader';
import { ActionReader } from '../ActionReader';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { OPERATION_HINT } from '../OperationHint';
import { OPERATION_KINDS } from '../OperationKinds';
import { OPERATION_OPTIONS } from '../OperationOptions';
import { RuleChecks } from '../RuleChecks';
import { type OnResponseOptions, RuleTypeBase } from '../RuleTypeBase';

const SET_COOKIE_NAME = 'Set-Cookie';

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
    return header.name.toLowerCase() === SET_COOKIE_NAME.toLowerCase()
        && SetCookieHeader.parse(header.value).name === name;
}

function cookieOf(action: ResponseCookieAction, context: RuleContext): SetCookie {
    return {
        ...SetCookieHeader.empty(
            /* name: */ action.name,
            /* value: */ context.render(action.value),
        ),
        domain: action.domain,
        path: action.path,
        maxAge: action.maxAge,
        sameSite: action.sameSite,
        secure: action.secure,
        httpOnly: action.httpOnly,
    };
}

interface UpdatedOptions {
    existing: SetCookie;
    action: ResponseCookieAction;
    context: RuleContext;
}

function updated({ existing, action, context }: UpdatedOptions): SetCookie {
    return {
        ...existing,
        value: action.value === '' ? existing.value : context.render(action.value),
        domain: action.domain === '' ? existing.domain : action.domain,
        path: action.path === '' ? existing.path : action.path,
        maxAge: action.maxAge === '' ? existing.maxAge : action.maxAge,
        sameSite: action.sameSite === '' ? existing.sameSite : action.sameSite,
        secure: action.secure || existing.secure,
        httpOnly: action.httpOnly || existing.httpOnly,
    };
}

interface ApplyOptions {
    headers: HeaderEntry[];
    action: ResponseCookieAction;
    context: RuleContext;
}

interface CookieApplier {
    op: string;
    apply(options: ApplyOptions): HeaderEntry[];
}

interface AddedOptions {
    headers: HeaderEntry[];
    action: ResponseCookieAction;
    context: RuleContext;
}

function added({ headers, action, context }: AddedOptions): HeaderEntry[] {
    return HeaderList.append({
        headers,
        name: SET_COOKIE_NAME,
        value: SetCookieHeader.serialize(cookieOf(action, context)),
    });
}

function hasNamed(headers: HeaderEntry[], name: string): boolean {
    return headers.some(header => isNamed(header, name));
}

const COOKIE_APPLIERS: CookieApplier[] = [
    {
        op: OPERATION_KINDS.Add,
        apply: added,
    },
    {
        op: OPERATION_KINDS.AddIfMissing,
        apply: ({ headers, action, context }) => hasNamed(headers, action.name)
            ? headers
            : added({ headers, action, context }),
    },
    {
        op: OPERATION_KINDS.AddOrUpdate,
        apply: ({ headers, action, context }) => !hasNamed(headers, action.name)
            ? added({ headers, action, context })
            : headers.map(header => !isNamed(header, action.name)
                ? header
                : {
                    ...header,
                    value: SetCookieHeader.serialize(updated({
                        existing: SetCookieHeader.parse(header.value),
                        action,
                        context,
                    })),
                }),
    },
    {
        op: OPERATION_KINDS.Remove,
        apply: ({ headers, action }) => headers.filter(header => !isNamed(header, action.name)),
    },
];

export class ResponseCookieRule extends RuleTypeBase<ResponseCookieAction> {
    readonly id = RULE_TYPE_IDS.ResponseCookie;
    readonly category = RULE_CATEGORY.Cookies;
    readonly label = 'Response cookie';
    readonly description = 'Add, update or remove a Set-Cookie with all its attributes.';
    override readonly handlesResponse = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Select,
            key: 'op',
            label: 'Operation',
            hint: `${OPERATION_HINT} Add or update keeps the attributes you leave empty.`,
            options: OPERATION_OPTIONS,
        },
        {
            kind: FIELD_KIND.Text,
            key: 'name',
            label: 'Cookie name',
        },
        {
            kind: FIELD_KIND.Text,
            key: 'value',
            label: 'Value',
            hint: "Empty keeps the server's value when changing.",
            visibleWhen: action => action['op'] !== OPERATION_KINDS.Remove,
        },
        {
            kind: FIELD_KIND.Text,
            key: 'domain',
            label: 'Domain',
            visibleWhen: action => action['op'] !== OPERATION_KINDS.Remove,
        },
        {
            kind: FIELD_KIND.Text,
            key: 'path',
            label: 'Path',
            placeholder: '/',
            visibleWhen: action => action['op'] !== OPERATION_KINDS.Remove,
        },
        {
            kind: FIELD_KIND.Text,
            key: 'maxAge',
            label: 'Max-Age (seconds)',
            visibleWhen: action => action['op'] !== OPERATION_KINDS.Remove,
        },
        {
            kind: FIELD_KIND.Select,
            key: 'sameSite',
            label: 'SameSite',
            options: [
                {
                    value: '',
                    label: 'Not set',
                },
                {
                    value: 'Lax',
                    label: 'Lax',
                },
                {
                    value: 'Strict',
                    label: 'Strict',
                },
                {
                    value: 'None',
                    label: 'None',
                },
            ],
            visibleWhen: action => action['op'] !== OPERATION_KINDS.Remove,
        },
        {
            kind: FIELD_KIND.Checkbox,
            key: 'secure',
            label: 'Secure',
            visibleWhen: action => action['op'] !== OPERATION_KINDS.Remove,
        },
        {
            kind: FIELD_KIND.Checkbox,
            key: 'httpOnly',
            label: 'HttpOnly',
            visibleWhen: action => action['op'] !== OPERATION_KINDS.Remove,
        },
    ];

    protected defaults(): ResponseCookieAction {
        return {
            op: OPERATION_KINDS.AddOrUpdate,
            name: '',
            value: '',
            domain: '',
            path: '/',
            maxAge: '',
            sameSite: '',
            secure: false,
            httpOnly: false,
        };
    }

    protected read(action: RuleAction): ResponseCookieAction {
        return {
            op: ActionReader.text({ raw: action, key: 'op', fallback: OPERATION_KINDS.AddOrUpdate }),
            name: ActionReader.text({ raw: action, key: 'name' }),
            value: ActionReader.text({ raw: action, key: 'value' }),
            domain: ActionReader.text({ raw: action, key: 'domain' }),
            path: ActionReader.text({ raw: action, key: 'path' }),
            maxAge: ActionReader.text({ raw: action, key: 'maxAge' }),
            sameSite: ActionReader.text({ raw: action, key: 'sameSite' }),
            secure: ActionReader.bool({ raw: action, key: 'secure', fallback: false }),
            httpOnly: ActionReader.bool({ raw: action, key: 'httpOnly', fallback: false }),
        };
    }

    override withoutSecrets(action: RuleAction): RuleAction {
        return {
            ...action,
            value: '',
        };
    }

    protected describe(action: ResponseCookieAction): string {
        return `${action.op} Set-Cookie ${action.name}`;
    }

    protected override check(action: ResponseCookieAction): string[] {
        return RuleChecks.required(action.name, 'Cookie name');
    }

    protected override onResponse(args: OnResponseOptions<ResponseCookieAction>): ResponseDraft {
        const applier = COOKIE_APPLIERS.find(candidate => candidate.op === args.action.op)
            ?? COOKIE_APPLIERS.find(candidate => candidate.op === OPERATION_KINDS.AddOrUpdate)!;

        return {
            ...args.draft,
            headers: applier.apply({
                headers: args.draft.headers,
                action: args.action,
                context: args.context,
            }),
        };
    }
}
