import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import { CspText } from '../../../Http/CspText';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { HEADER_NAMES } from '../../../../Contracts/Http/HeaderNames';
import { Result } from '../../../Results/Result';
import type { ResponseDraft } from '../../Drafts/ResponseDraft';
import { HeaderList } from '../../Http/HeaderList';
import { ActionReader } from '../ActionReader';
import type { DnrRuleDraft } from '../DnrRuleDraft';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { type BrowserRulesOptions, type OnResponseOptions, RuleTypeBase } from '../RuleTypeBase';

const KEEP_CSP_KEY = 'keepCsp';
const FRAME_ANCESTORS = 'frame-ancestors';
const KEEP_CSP_ON_INSPECTED_TAB = 'Keeping the rest of the Content-Security-Policy works on the inspected tab only. Turn it off to work on every tab.';

interface AllowEmbeddingAction {
    keepCsp: boolean;
}

function isContentSecurityPolicy(header: HeaderEntry): boolean {
    return header.name.toLowerCase() === HEADER_NAMES.ContentSecurityPolicy.toLowerCase();
}

function withoutFrameAncestors(headers: ResponseDraft['headers']): ResponseDraft['headers'] {
    return headers
        .map(header => isContentSecurityPolicy(header)
            ? {
                ...header,
                value: CspText.withoutDirective(header.value, FRAME_ANCESTORS),
            }
            : header)
        .filter(header => !isContentSecurityPolicy(header) || header.value !== '');
}

export class AllowEmbeddingRule extends RuleTypeBase<AllowEmbeddingAction> {
    readonly id = RULE_TYPE_IDS.AllowEmbedding;
    readonly category = RULE_CATEGORY.Headers;
    readonly label = 'Allow embedding';
    readonly description = 'Remove X-Frame-Options and the CSP frame-ancestors directive, so the page loads in an iframe.';
    override readonly handlesResponse = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Checkbox,
            key: KEEP_CSP_KEY,
            label: 'Keep the rest of the Content-Security-Policy',
            hint: 'On: only frame-ancestors is removed, on the inspected tab. Off: the whole header is removed, on every tab.',
        },
    ];

    protected defaults(): AllowEmbeddingAction {
        return {
            keepCsp: true,
        };
    }

    protected read(action: RuleAction): AllowEmbeddingAction {
        return {
            keepCsp: ActionReader.bool({ raw: action, key: KEEP_CSP_KEY, fallback: true }),
        };
    }

    protected describe(action: AllowEmbeddingAction): string {
        return action.keepCsp
            ? 'remove X-Frame-Options and frame-ancestors'
            : 'remove X-Frame-Options and Content-Security-Policy';
    }

    protected override onResponse(args: OnResponseOptions<AllowEmbeddingAction>): ResponseDraft {
        const withoutFrameOptions = HeaderList.remove(args.draft.headers, HEADER_NAMES.XFrameOptions);

        return {
            ...args.draft,
            headers: args.action.keepCsp
                ? withoutFrameAncestors(withoutFrameOptions)
                : HeaderList.remove(withoutFrameOptions, HEADER_NAMES.ContentSecurityPolicy),
        };
    }

    protected override browserRules({
        action,
        condition,
    }: BrowserRulesOptions<AllowEmbeddingAction>): Result<DnrRuleDraft[]> {
        if (action.keepCsp) {
            return Result.fail(KEEP_CSP_ON_INSPECTED_TAB);
        }

        return Result.ok([
            {
                action: {
                    type: 'modifyHeaders',
                    responseHeaders: [
                        {
                            header: HEADER_NAMES.XFrameOptions,
                            operation: 'remove',
                        },
                        {
                            header: HEADER_NAMES.ContentSecurityPolicy,
                            operation: 'remove',
                        },
                    ],
                },
                condition,
            },
        ]);
    }
}
