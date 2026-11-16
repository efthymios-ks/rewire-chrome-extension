import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { HeaderSuggestions } from '../../../Http/HeaderSuggestions';
import { Result } from '../../../Results/Result';
import type { ResponseDraft } from '../../Drafts/ResponseDraft';
import type { DnrRuleDraft } from '../DnrRuleDraft';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { OPERATION_HINT } from '../OperationHint';
import { OPERATION_KINDS } from '../OperationKinds';
import { type BrowserRulesOptions, type OnResponseOptions, RuleTypeBase } from '../RuleTypeBase';
import { type HeaderOperation, HeaderOperations } from './HeaderOperations';

interface ResponseHeaderAction {
    operations: HeaderOperation[];
}

export class ResponseHeaderRule extends RuleTypeBase<ResponseHeaderAction> {
    readonly id = RULE_TYPE_IDS.ResponseHeader;
    readonly category = RULE_CATEGORY.Headers;
    readonly label = 'Response header';
    readonly description = 'Add, update or remove response headers.';
    override readonly handlesResponse = true;
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

    protected defaults(): ResponseHeaderAction {
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

    protected read(action: RuleAction): ResponseHeaderAction {
        return {
            operations: HeaderOperations.read(action),
        };
    }

    protected describe(action: ResponseHeaderAction): string {
        return HeaderOperations.describe(action.operations);
    }

    override withoutSecrets(action: RuleAction): RuleAction {
        return HeaderOperations.withoutSecrets(action);
    }

    protected override check(action: ResponseHeaderAction): string[] {
        return HeaderOperations.check(action.operations);
    }

    protected override onResponse(args: OnResponseOptions<ResponseHeaderAction>): ResponseDraft {
        return {
            ...args.draft,
            headers: HeaderOperations.apply({
                headers: args.draft.headers,
                operations: args.action.operations,
                context: args.context,
            }),
        };
    }

    protected override browserRules({
        action,
        condition,
        context,
    }: BrowserRulesOptions<ResponseHeaderAction>): Result<DnrRuleDraft[]> {
        const responseHeaders = HeaderOperations.toBrowser({
            operations: action.operations,
            context,
            isRequest: false,
        });
        if (responseHeaders.hasErrors) {
            return responseHeaders;
        }

        return Result.ok([
            {
                action: {
                    type: 'modifyHeaders',
                    responseHeaders: responseHeaders.value,
                },
                condition,
            },
        ]);
    }
}
