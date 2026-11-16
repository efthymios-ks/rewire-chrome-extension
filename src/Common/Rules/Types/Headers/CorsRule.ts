import { STATUS_CODE_LIMITS } from '../../../../Contracts/Http/StatusCodeLimits';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { Result } from '../../../Results/Result';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import type { ResponseDraft } from '../../Drafts/ResponseDraft';
import { HeaderList } from '../../Http/HeaderList';
import { ActionReader } from '../ActionReader';
import type { DnrRuleDraft } from '../DnrRuleDraft';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import {
    type BrowserRulesOptions,
    type OnRequestOptions,
    type OnResponseOptions,
    RuleTypeBase,
} from '../RuleTypeBase';
import { CORS_DEFAULTS } from './CorsDefaults';
import { CorsHeaders, type CorsPolicy } from './CorsHeaders';

interface CorsAction extends CorsPolicy {
    answerPreflight: boolean;
}

export class CorsRule extends RuleTypeBase<CorsAction> {
    readonly id = RULE_TYPE_IDS.Cors;
    readonly category = RULE_CATEGORY.Headers;
    readonly label = 'CORS';
    readonly description = 'Rewrite Access-Control-* response headers; answer preflights on the inspected tab.';
    override readonly handlesRequest = true;
    override readonly handlesResponse = true;
    override readonly runsOnBothEngines = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Text,
            key: 'allowedOrigin',
            label: 'Allowed origin',
            placeholder: 'http://localhost:3000',
            hint: 'Empty allows any origin. A specific origin also allows credentials.',
        },
        {
            kind: FIELD_KIND.Text,
            key: 'allowedMethods',
            label: 'Allowed methods',
            placeholder: 'GET, POST',
            hint: `Empty sends ${CORS_DEFAULTS.AllowedMethods}.`,
        },
        {
            kind: FIELD_KIND.Text,
            key: 'allowedHeaders',
            label: 'Allowed headers',
            placeholder: 'Content-Type',
            hint: `Empty sends ${CORS_DEFAULTS.AllowedHeaders}.`,
        },
        {
            kind: FIELD_KIND.Checkbox,
            key: 'answerPreflight',
            label: 'Answer OPTIONS preflights with 204 on the inspected tab',
        },
    ];

    protected defaults(): CorsAction {
        return {
            allowedOrigin: '',
            allowedMethods: CORS_DEFAULTS.AllowedMethods,
            allowedHeaders: CORS_DEFAULTS.AllowedHeaders,
            answerPreflight: true,
        };
    }

    protected read(action: RuleAction): CorsAction {
        return {
            allowedOrigin: ActionReader.text({ raw: action, key: 'allowedOrigin' }),
            allowedMethods: ActionReader.text({
                raw: action,
                key: 'allowedMethods',
                fallback: CORS_DEFAULTS.AllowedMethods,
            }),
            allowedHeaders: ActionReader.text({
                raw: action,
                key: 'allowedHeaders',
                fallback: CORS_DEFAULTS.AllowedHeaders,
            }),
            answerPreflight: ActionReader.bool({ raw: action, key: 'answerPreflight', fallback: true }),
        };
    }

    protected describe(action: CorsAction): string {
        const origin = action.allowedOrigin === '' ? CORS_DEFAULTS.AnyOrigin : action.allowedOrigin;

        return `Allow ${origin}${action.answerPreflight ? ', answer preflights' : ''}`;
    }

    protected override onRequest({ draft, action }: OnRequestOptions<CorsAction>): RequestDraft {
        if (!action.answerPreflight || !CorsHeaders.isPreflight(draft)) {
            return draft;
        }

        return {
            ...draft,
            response: {
                status: STATUS_CODE_LIMITS.NoContent,
                headers: CorsHeaders.forPreflight(draft, action),
                body: '',
            },
        };
    }

    protected override onResponse(args: OnResponseOptions<CorsAction>): ResponseDraft {
        const headers = CorsHeaders
            .forResponse(args.action)
            .reduce(
                /* callbackfn: */ (current, header) => HeaderList.set({
                    headers: current,
                    name: header.name,
                    value: header.value,
                }),
                /* initialValue: */ args.draft.headers,
            );

        return {
            ...args.draft,
            headers,
        };
    }

    protected override browserRules({
        action,
        condition,
    }: BrowserRulesOptions<CorsAction>): Result<DnrRuleDraft[]> {
        return Result.ok([
            {
                action: {
                    type: 'modifyHeaders',
                    responseHeaders: CorsHeaders
                        .forResponse(action)
                        .map(header => ({
                            header: header.name,
                            operation: 'set',
                            value: header.value,
                        })),
                },
                condition,
            },
        ]);
    }
}
