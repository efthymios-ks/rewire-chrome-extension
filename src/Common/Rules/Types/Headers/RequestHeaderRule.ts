import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { HeaderSuggestions } from '../../../Http/HeaderSuggestions';
import { Result } from '../../../Results/Result';
import type { RequestDraft } from '../../Drafts/RequestDraft';
import type { DnrRuleDraft } from '../DnrRuleDraft';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { OPERATION_HINT } from '../OperationHint';
import { OPERATION_KINDS } from '../OperationKinds';
import { type BrowserRulesOptions, type OnRequestOptions, RuleTypeBase } from '../RuleTypeBase';
import { type HeaderOperation, HeaderOperations } from './HeaderOperations';

interface RequestHeaderAction {
    operations: HeaderOperation[];
}

export class RequestHeaderRule extends RuleTypeBase<RequestHeaderAction> {
    readonly id = RULE_TYPE_IDS.RequestHeader;
    readonly category = RULE_CATEGORY.Headers;
    readonly label = 'Request header';
    readonly description = 'Add, update or remove request headers.';
    override readonly handlesRequest = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Operations,
            key: 'operations',
            label: 'Headers',
            nameLabel: 'Header',
            nameSuggestions: HeaderSuggestions.names(),
            valueSuggestionsFor: HeaderSuggestions.valuesFor,
            hint: `${OPERATION_HINT} Values can use {{variables}}.`,
        },
    ];

    protected defaults(): RequestHeaderAction {
        return {
            operations: [
                {
                    op: OPERATION_KINDS.AddOrUpdate,
                    name: '',
                    value: '',
                },
            ],
        };
    }

    protected read(action: RuleAction): RequestHeaderAction {
        return {
            operations: HeaderOperations.read(action),
        };
    }

    protected describe(action: RequestHeaderAction): string {
        return HeaderOperations.describe(action.operations);
    }

    override withoutSecrets(action: RuleAction): RuleAction {
        return HeaderOperations.withoutSecrets(action);
    }

    protected override check(action: RequestHeaderAction): string[] {
        return HeaderOperations.check(action.operations);
    }

    protected override onRequest({
        draft,
        action,
        context,
    }: OnRequestOptions<RequestHeaderAction>): RequestDraft {
        return {
            ...draft,
            headers: HeaderOperations.apply({
                headers: draft.headers,
                operations: action.operations,
                context,
            }),
        };
    }

    protected override browserRules({
        action,
        condition,
        context,
    }: BrowserRulesOptions<RequestHeaderAction>): Result<DnrRuleDraft[]> {
        const requestHeaders = HeaderOperations.toBrowser({
            operations: action.operations,
            context,
            isRequest: true,
        });
        if (requestHeaders.hasErrors) {
            return requestHeaders;
        }

        return Result.ok([
            {
                action: {
                    type: 'modifyHeaders',
                    requestHeaders: requestHeaders.value,
                },
                condition,
            },
        ]);
    }
}
