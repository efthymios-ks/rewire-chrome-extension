import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import { StatusCodeLimits } from "../../../../Contracts/Http/StatusCodePresets";
import { Result } from "../../../Results/Result";
import type { RuleContext } from "../../Context/RuleContext";
import type { DnrCondition } from "../../Criteria/DnrFragment";
import type { RequestDraft, ResponseDraft } from "../../Drafts/Drafts";
import { HeaderList } from "../../Http/HeaderList";
import { ActionReader } from "../ActionReader";
import type { DnrRuleDraft } from "../DnrRuleDraft";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { type ResponseArguments, RuleTypeBase } from "../RuleTypeBase";
import { CorsDefaults, CorsHeaders, type CorsPolicy } from "./CorsHeaders";

interface CorsAction extends CorsPolicy {
    answerPreflight: boolean;
}

export class CorsRule extends RuleTypeBase<CorsAction> {
    readonly id = RuleTypeIds.Cors;
    readonly category = RuleCategory.Headers;
    readonly label = "CORS";
    readonly description = "Rewrite Access-Control-* response headers; answer preflights on the inspected tab.";
    override readonly handlesRequest = true;
    override readonly handlesResponse = true;
    override readonly runsOnBothEngines = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Text,
            key: "allowedOrigin",
            label: "Allowed origin",
            placeholder: "http://localhost:3000",
            hint: "Empty allows any origin. A specific origin also allows credentials.",
        },
        {
            kind: FieldKind.Text,
            key: "allowedMethods",
            label: "Allowed methods",
            placeholder: "GET, POST",
            hint: `Empty sends ${CorsDefaults.AllowedMethods}.`,
        },
        {
            kind: FieldKind.Text,
            key: "allowedHeaders",
            label: "Allowed headers",
            placeholder: "Content-Type",
            hint: `Empty sends ${CorsDefaults.AllowedHeaders}.`,
        },
        {
            kind: FieldKind.Checkbox,
            key: "answerPreflight",
            label: "Answer OPTIONS preflights with 204 on the inspected tab",
        },
    ];

    protected defaults(): CorsAction {
        return {
            allowedOrigin: "",
            allowedMethods: CorsDefaults.AllowedMethods,
            allowedHeaders: CorsDefaults.AllowedHeaders,
            answerPreflight: true,
        };
    }

    protected read(action: RuleAction): CorsAction {
        return {
            allowedOrigin: ActionReader.text(action, "allowedOrigin"),
            allowedMethods: ActionReader.text(
                action,
                "allowedMethods",
                CorsDefaults.AllowedMethods
            ),
            allowedHeaders: ActionReader.text(
                action,
                "allowedHeaders",
                CorsDefaults.AllowedHeaders
            ),
            answerPreflight: ActionReader.bool(
                action,
                "answerPreflight",
                true
            ),
        };
    }

    protected describe(action: CorsAction): string {
        return `Allow ${action.allowedOrigin || CorsDefaults.AnyOrigin}${action.answerPreflight ? ", answer preflights" : ""}`;
    }

    protected override onRequest(
        draft: RequestDraft,
        action: CorsAction,
        _context: RuleContext
    ): RequestDraft {
        if (!action.answerPreflight || !CorsHeaders.isPreflight(draft)) {
            return draft;
        }

        return {
            ...draft,
            response: {
                status: StatusCodeLimits.NoContent,
                headers: CorsHeaders.forPreflight(draft, action),
                body: "",
            },
        };
    }

    protected override onResponse(args: ResponseArguments<CorsAction>): ResponseDraft {
        const headers = CorsHeaders
            .forResponse(args.action)
            .reduce(
                (current, header) => HeaderList.set(
                    current,
                    header.name,
                    header.value
                ),
                args.draft.headers
            );

        return {
            ...args.draft,
            headers,
        };
    }

    protected override browserRules(
        action: CorsAction,
        condition: DnrCondition,
        _context: RuleContext
    ): Result<DnrRuleDraft[]> {
        return Result.ok([
            {
                action: {
                    type: "modifyHeaders",
                    responseHeaders: CorsHeaders
                        .forResponse(action)
                        .map(header => ({
                            header: header.name,
                            operation: "set",
                            value: header.value,
                        })),
                },
                condition,
            },
        ]);
    }
}
