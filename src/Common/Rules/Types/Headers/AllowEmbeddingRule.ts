import { CspText } from "../../../Http/CspText";
import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import { HeaderNames } from "../../../../Contracts/Http/HeaderNames";
import { Result } from "../../../Results/Result";
import type { RuleContext } from "../../Context/RuleContext";
import type { DnrCondition } from "../../Criteria/DnrFragment";
import type { ResponseDraft } from "../../Drafts/Drafts";
import { HeaderList } from "../../Http/HeaderList";
import { ActionReader } from "../ActionReader";
import type { DnrRuleDraft } from "../DnrRuleDraft";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { type ResponseArguments, RuleTypeBase } from "../RuleTypeBase";

const KeepCspKey = "keepCsp";
const FrameAncestors = "frame-ancestors";
const KeepCspOnInspectedTab = "Keeping the rest of the Content-Security-Policy works on the inspected tab only. Turn it off to work on every tab.";

interface AllowEmbeddingAction {
    keepCsp: boolean;
}

function withoutFrameAncestors(headers: ResponseDraft["headers"]): ResponseDraft["headers"] {
    return headers
        .map(header => header.name.toLowerCase() === HeaderNames.ContentSecurityPolicy.toLowerCase()
            ? {
                ...header,
                value: CspText.withoutDirective(header.value, FrameAncestors),
            }
            : header)
        .filter(header => header.name.toLowerCase() !== HeaderNames.ContentSecurityPolicy.toLowerCase() || header.value !== "");
}

export class AllowEmbeddingRule extends RuleTypeBase<AllowEmbeddingAction> {
    readonly id = RuleTypeIds.AllowEmbedding;
    readonly category = RuleCategory.Headers;
    readonly label = "Allow embedding";
    readonly description = "Remove X-Frame-Options and the CSP frame-ancestors directive, so the page loads in an iframe.";
    override readonly handlesResponse = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Checkbox,
            key: KeepCspKey,
            label: "Keep the rest of the Content-Security-Policy",
            hint: "On: only frame-ancestors is removed, on the inspected tab. Off: the whole header is removed, on every tab.",
        },
    ];

    protected defaults(): AllowEmbeddingAction {
        return {
            keepCsp: true,
        };
    }

    protected read(action: RuleAction): AllowEmbeddingAction {
        return {
            keepCsp: ActionReader.bool(
                action,
                KeepCspKey,
                true
            ),
        };
    }

    protected describe(action: AllowEmbeddingAction): string {
        return action.keepCsp ? "remove X-Frame-Options and frame-ancestors" : "remove X-Frame-Options and Content-Security-Policy";
    }

    protected override onResponse(args: ResponseArguments<AllowEmbeddingAction>): ResponseDraft {
        const withoutFrameOptions = HeaderList.remove(args.draft.headers, HeaderNames.XFrameOptions);

        return {
            ...args.draft,
            headers: args.action.keepCsp
                ? withoutFrameAncestors(withoutFrameOptions)
                : HeaderList.remove(withoutFrameOptions, HeaderNames.ContentSecurityPolicy),
        };
    }

    protected override browserRules(
        action: AllowEmbeddingAction,
        condition: DnrCondition,
        _context: RuleContext
    ): Result<DnrRuleDraft[]> {
        if (action.keepCsp) {
            return Result.fail(KeepCspOnInspectedTab);
        }

        return Result.ok([
            {
                action: {
                    type: "modifyHeaders",
                    responseHeaders: [
                        {
                            header: HeaderNames.XFrameOptions,
                            operation: "remove",
                        },
                        {
                            header: HeaderNames.ContentSecurityPolicy,
                            operation: "remove",
                        },
                    ],
                },
                condition,
            },
        ]);
    }
}
