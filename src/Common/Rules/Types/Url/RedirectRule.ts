import { HEADER_NAMES } from '../../../../Contracts/Http/HeaderNames';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import type { RuleCriteria } from '../../../../Contracts/Rules/RuleCriteria';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import { ActionReader } from '../ActionReader';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { RuleChecks } from '../RuleChecks';
import { type OnRequestOptions, RuleTypeBase } from '../RuleTypeBase';
import { DEFAULT_REDIRECT_STATUS } from './DefaultRedirectStatus';
import { RegexDestination } from './RegexDestination';

interface RedirectStatusOption {
    code: number;
    label: string;
}

const REDIRECT_STATUS_OPTIONS: readonly RedirectStatusOption[] = [
    {
        code: 301,
        label: '301 Moved Permanently',
    },
    {
        code: 302,
        label: '302 Found',
    },
    {
        code: 303,
        label: '303 See Other',
    },
    {
        code: 307,
        label: '307 Temporary Redirect',
    },
    {
        code: 308,
        label: '308 Permanent Redirect',
    },
];

const TARGET_LABEL = 'Location URL';

interface RedirectAction {
    target: string;
    status: number;
}

function statusOf(action: RuleAction): number {
    const status = Number(action['status'] ?? DEFAULT_REDIRECT_STATUS);
    const codes: readonly number[] = REDIRECT_STATUS_OPTIONS.map(option => option.code);

    return codes.includes(status) ? status : DEFAULT_REDIRECT_STATUS;
}

export class RedirectRule extends RuleTypeBase<RedirectAction> {
    readonly id = RULE_TYPE_IDS.Redirect;
    readonly category = RULE_CATEGORY.UrlAndRedirects;
    readonly label = 'Redirect';
    readonly description = 'Answer matching requests with an HTTP redirect (status + Location header). The browser follows it.';
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Text,
            key: 'target',
            label: TARGET_LABEL,
            placeholder: 'https://example.com/$1',
            hint: '$1 to $9 insert the groups of a URL condition that matches a regex. Can use {{variables}}.',
        },
        {
            kind: FIELD_KIND.Select,
            key: 'status',
            label: 'Status',
            options: REDIRECT_STATUS_OPTIONS.map(option => ({
                value: String(option.code),
                label: option.label,
            })),
        },
    ];

    protected defaults(): RedirectAction {
        return {
            target: '',
            status: DEFAULT_REDIRECT_STATUS,
        };
    }

    protected read(action: RuleAction): RedirectAction {
        return {
            target: ActionReader.text({ raw: action, key: 'target' }),
            status: statusOf(action),
        };
    }

    protected describe(action: RedirectAction): string {
        return `${action.status} -> ${action.target}`;
    }

    protected override check(action: RedirectAction, criteria: RuleCriteria): string[] {
        const required = RuleChecks.required(action.target, TARGET_LABEL);

        return required.length > 0 ? required : RegexDestination.groupErrorsOf(action.target, criteria);
    }

    protected override onRequest({
        draft,
        action,
        context,
        criteria,
    }: OnRequestOptions<RedirectAction>): RequestDraft {
        const url = RegexDestination.resolve({
            url: draft.url,
            target: context.render(action.target),
            criteria,
        });
        if (url == null) {
            return draft;
        }

        return {
            ...draft,
            response: {
                status: action.status,
                headers: [
                    {
                        name: HEADER_NAMES.Location,
                        value: url,
                    },
                ],
                body: '',
            },
        };
    }
}
