import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import { Result } from "../../../Results/Result";
import type { RuleContext } from "../../Context/RuleContext";
import type { DnrCondition } from "../../Criteria/DnrFragment";
import type { ResponseDraft } from "../../Drafts/Drafts";
import { HeaderList } from "../../Http/HeaderList";
import { ActionReader } from "../ActionReader";
import type { DnrRuleDraft } from "../DnrRuleDraft";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { type ResponseArguments, RuleTypeBase } from "../RuleTypeBase";

interface SecurityHeaderPreset {
    id: string;
    label: string;
    header: string;
    value: string;
}

const SecurityHeaderPresets: SecurityHeaderPreset[] = [
    {
        id: "hsts",
        label: "HSTS",
        header: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
    },
    {
        id: "csp",
        label: "Content Security Policy",
        header: "Content-Security-Policy",
        value: "default-src 'self'",
    },
    {
        id: "permissionsPolicy",
        label: "Permissions Policy",
        header: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
    },
    {
        id: "contentTypeOptions",
        label: "X-Content-Type-Options",
        header: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        id: "frameOptions",
        label: "X-Frame-Options",
        header: "X-Frame-Options",
        value: "DENY",
    },
    {
        id: "referrerPolicy",
        label: "Referrer Policy",
        header: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
];

interface SecurityHeadersAction {
    preset: string;
    value: string;
}

function presetOf(id: string): SecurityHeaderPreset {
    return SecurityHeaderPresets.find(preset => preset.id === id) ?? SecurityHeaderPresets[0]!;
}

export class SecurityHeadersRule extends RuleTypeBase<SecurityHeadersAction> {
    readonly id = RuleTypeIds.SecurityHeaders;
    readonly category = RuleCategory.Headers;
    readonly label = "Security header";
    readonly description = "Set HSTS, CSP, Permissions-Policy and other security headers from a preset.";
    override readonly handlesResponse = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Select,
            key: "preset",
            label: "Preset",
            options: SecurityHeaderPresets.map(preset => ({
                value: preset.id,
                label: preset.label,
            })),
        },
        {
            kind: FieldKind.Text,
            key: "value",
            label: "Value",
            hint: "Empty uses the preset's value.",
        },
    ];

    protected defaults(): SecurityHeadersAction {
        return {
            preset: "hsts",
            value: "",
        };
    }

    protected read(action: RuleAction): SecurityHeadersAction {
        return {
            preset: ActionReader.text(
                action,
                "preset",
                "hsts"
            ),
            value: ActionReader.text(action, "value"),
        };
    }

    protected describe(action: SecurityHeadersAction): string {
        const preset = presetOf(action.preset);

        return `${preset.header}: ${action.value || preset.value}`;
    }

    protected override onResponse(args: ResponseArguments<SecurityHeadersAction>): ResponseDraft {
        const preset = presetOf(args.action.preset);

        return {
            ...args.draft,
            headers: HeaderList.set(
                args.draft.headers,
                preset.header,
                args.action.value || preset.value
            ),
        };
    }

    protected override browserRules(
        action: SecurityHeadersAction,
        condition: DnrCondition,
        _context: RuleContext
    ): Result<DnrRuleDraft[]> {
        const preset = presetOf(action.preset);

        return Result.ok([
            {
                action: {
                    type: "modifyHeaders",
                    responseHeaders: [
                        {
                            header: preset.header,
                            operation: "set",
                            value: action.value || preset.value,
                        },
                    ],
                },
                condition,
            },
        ]);
    }
}
