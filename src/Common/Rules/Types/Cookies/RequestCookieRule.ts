import { HEADER_NAMES } from '../../../../Contracts/Http/HeaderNames';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { HeaderLookup } from '../../../Http/HeaderLookup';
import { OwnEntry } from '../../../Objects/OwnEntry';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import { CookieHeader } from '../../Http/CookieHeader';
import { HeaderList } from '../../Http/HeaderList';
import { ActionReader } from '../ActionReader';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { OPERATION_HINT } from '../OperationHint';
import { OPERATION_KINDS } from '../OperationKinds';
import { OPERATION_OPTIONS } from '../OperationOptions';
import { RuleChecks } from '../RuleChecks';
import { type OnRequestOptions, RuleTypeBase } from '../RuleTypeBase';


interface CookieApplierOptions {
    header: string | null;
    name: string;
    value: string;
}

type CookieApplier = (options: CookieApplierOptions) => string;

const COOKIE_APPLIERS: Record<string, CookieApplier> = {
    [OPERATION_KINDS.Add]: ({ header, name, value }) => CookieHeader.append({ header, name, value }),
    [OPERATION_KINDS.AddIfMissing]: ({
        header,
        name,
        value,
    }) => CookieHeader.valuesOf(header, name).length > 0
        ? header ?? ''
        : CookieHeader.append({ header, name, value }),
    [OPERATION_KINDS.AddOrUpdate]: ({ header, name, value }) => CookieHeader.set({ header, name, value }),
    [OPERATION_KINDS.Remove]: ({ header, name }) => CookieHeader.remove(header, name),
};

interface RequestCookieAction {
    op: string;
    name: string;
    value: string;
}

export class RequestCookieRule extends RuleTypeBase<RequestCookieAction> {
    readonly id = RULE_TYPE_IDS.RequestCookie;
    readonly category = RULE_CATEGORY.Cookies;
    readonly label = 'Request cookie';
    readonly description = 'Add, update or remove one cookie in the Cookie header.';
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Select,
            key: 'op',
            label: 'Operation',
            hint: OPERATION_HINT,
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
            hint: 'Can use {{variables}}.',
            visibleWhen: action => action['op'] !== OPERATION_KINDS.Remove,
        },
    ];

    protected defaults(): RequestCookieAction {
        return {
            op: OPERATION_KINDS.AddOrUpdate,
            name: '',
            value: '',
        };
    }

    protected read(action: RuleAction): RequestCookieAction {
        return {
            op: ActionReader.text({ raw: action, key: 'op', fallback: OPERATION_KINDS.AddOrUpdate }),
            name: ActionReader.text({ raw: action, key: 'name' }),
            value: ActionReader.text({ raw: action, key: 'value' }),
        };
    }

    protected describe(action: RequestCookieAction): string {
        return action.op === OPERATION_KINDS.Remove
            ? `remove ${action.name}`
            : `${action.name}=${action.value}`;
    }

    override withoutSecrets(action: RuleAction): RuleAction {
        return {
            ...action,
            value: '',
        };
    }

    protected override check(action: RequestCookieAction): string[] {
        return RuleChecks.required(action.name, 'Cookie name');
    }

    protected override onRequest({
        draft,
        action,
        context,
    }: OnRequestOptions<RequestCookieAction>): RequestDraft {
        const current = HeaderLookup.find(draft.headers, HEADER_NAMES.Cookie);
        const applier = OwnEntry.of(COOKIE_APPLIERS, action.op)
            ?? COOKIE_APPLIERS[OPERATION_KINDS.AddOrUpdate]!;
        const updated = applier({
            header: current,
            name: action.name,
            value: context.render(action.value),
        });
        const headers = updated === ''
            ? HeaderList.remove(draft.headers, HEADER_NAMES.Cookie)
            : HeaderList.set({ headers: draft.headers, name: HEADER_NAMES.Cookie, value: updated });

        return {
            ...draft,
            headers,
        };
    }
}
