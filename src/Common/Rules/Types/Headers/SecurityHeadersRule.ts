import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import { RULE_CATEGORY } from '../../../../Contracts/Rules/RuleCategory';
import { RULE_TYPE_IDS } from '../../../../Contracts/Rules/RuleTypeId';
import { Result } from '../../../Results/Result';
import type { ResponseDraft } from '../../Drafts/ResponseDraft';
import { HeaderList } from '../../Http/HeaderList';
import { ActionReader } from '../ActionReader';
import type { DnrRuleDraft } from '../DnrRuleDraft';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { type BrowserRulesOptions, type OnResponseOptions, RuleTypeBase } from '../RuleTypeBase';

interface SecurityHeaderPreset {
    id: string;
    label: string;
    header: string;
    value: string;
}

const SECURITY_HEADER_PRESETS: SecurityHeaderPreset[] = [
    {
        id: 'hsts',
        label: 'HSTS',
        header: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
    },
    {
        id: 'csp',
        label: 'Content Security Policy',
        header: 'Content-Security-Policy',
        value: "default-src 'self'",
    },
    {
        id: 'permissionsPolicy',
        label: 'Permissions Policy',
        header: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
    },
    {
        id: 'contentTypeOptions',
        label: 'X-Content-Type-Options',
        header: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        id: 'frameOptions',
        label: 'X-Frame-Options',
        header: 'X-Frame-Options',
        value: 'DENY',
    },
    {
        id: 'referrerPolicy',
        label: 'Referrer Policy',
        header: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
];

interface SecurityHeadersAction {
    preset: string;
    value: string;
}

function presetOf(id: string): SecurityHeaderPreset {
    return SECURITY_HEADER_PRESETS.find(preset => preset.id === id) ?? SECURITY_HEADER_PRESETS[0]!;
}

export class SecurityHeadersRule extends RuleTypeBase<SecurityHeadersAction> {
    readonly id = RULE_TYPE_IDS.SecurityHeaders;
    readonly category = RULE_CATEGORY.Headers;
    readonly label = 'Security header';
    readonly description = 'Set HSTS, CSP, Permissions-Policy and other security headers from a preset.';
    override readonly handlesResponse = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FIELD_KIND.Select,
            key: 'preset',
            label: 'Preset',
            options: SECURITY_HEADER_PRESETS.map(preset => ({
                value: preset.id,
                label: preset.label,
            })),
        },
        {
            kind: FIELD_KIND.Text,
            key: 'value',
            label: 'Value',
            hint: "Empty uses the preset's value.",
        },
    ];

    protected defaults(): SecurityHeadersAction {
        return {
            preset: 'hsts',
            value: '',
        };
    }

    protected read(action: RuleAction): SecurityHeadersAction {
        return {
            preset: ActionReader.text({ raw: action, key: 'preset', fallback: 'hsts' }),
            value: ActionReader.text({ raw: action, key: 'value' }),
        };
    }

    protected describe(action: SecurityHeadersAction): string {
        const preset = presetOf(action.preset);

        return `${preset.header}: ${action.value === '' ? preset.value : action.value}`;
    }

    protected override onResponse(args: OnResponseOptions<SecurityHeadersAction>): ResponseDraft {
        const preset = presetOf(args.action.preset);

        return {
            ...args.draft,
            headers: HeaderList.set({
                headers: args.draft.headers,
                name: preset.header,
                value: args.action.value === '' ? preset.value : args.action.value,
            }),
        };
    }

    protected override browserRules({
        action,
        condition,
    }: BrowserRulesOptions<SecurityHeadersAction>): Result<DnrRuleDraft[]> {
        const preset = presetOf(action.preset);

        return Result.ok([
            {
                action: {
                    type: 'modifyHeaders',
                    responseHeaders: [
                        {
                            header: preset.header,
                            operation: 'set',
                            value: action.value === '' ? preset.value : action.value,
                        },
                    ],
                },
                condition,
            },
        ]);
    }
}
