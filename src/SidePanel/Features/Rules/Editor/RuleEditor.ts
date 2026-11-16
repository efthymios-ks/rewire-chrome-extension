import { RuleTester } from '../../../../Common/Rules/Engine/RuleTester';
import type { RulePlan } from '../../../../Common/Rules/Engine/RulePlan';
import type { RuleType } from '../../../../Common/Rules/Types/RuleType';
import type { Rule } from '../../../../Contracts/Rules/Rule';
import { buildElement } from '../../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../../Core/Dom/ButtonVariants';
import { FormControls } from '../../../Core/Dom/FormControls';
import type { FileClient } from '../../../Core/FileClient';
import type { SettingsService } from '../../../Core/SettingsService';
import type { PanelContext } from '../../Shell/PanelContext';
import { RuleScopes } from '../RuleScopes';
import { SCOPE_APPEARANCES } from '../ScopeAppearance';
import { RuleTesterPanel } from '../Tester/RuleTesterPanel';
import { ActionForm } from './ActionForm';
import { CriteriaBuilder } from './CriteriaBuilder';

export interface RuleEditorArguments {
    context: PanelContext;
    fileClient: FileClient;
    type: RuleType;
    rule: Rule;
    onSave: (rule: Rule) => void;
    onCancel: () => void;
}

function section(title: string, ...children: HTMLElement[]): HTMLElement {
    return buildElement('section', {
        className: 'editor-section',
        children: [
            buildElement('h3', {
                className: 'editor-section-title',
                text: title,
            }),
            ...children,
        ],
    });
}

export class RuleEditor {
    readonly root: HTMLElement;

    private readonly _settingsService: SettingsService;
    private readonly _scope: HTMLElement;
    private readonly _errors: HTMLElement;
    private readonly _tester: RuleTesterPanel;
    private _draft: Rule;

    constructor(args: RuleEditorArguments) {
        this._draft = structuredClone(args.rule);
        this._settingsService = args.context.settingsService;
        this._scope = buildElement('p', {
            className: 'editor-scope',
        });
        this._errors = buildElement('ul', {
            className: 'form-error',
        });
        const settings = args.context.settingsService.current();
        this._tester = new RuleTesterPanel(
            /* sampleUrl: */ settings.testerSamples[0] ?? '',
            /* runner: */ input => RuleTester.testRule({
                plan: this.plan(),
                input,
                context: RuleScopes.contextOf(this._settingsService.current()),
            }),
        );

        this.root = buildElement('div', {
            className: 'rule-editor',
            children: [
                buildElement('p', {
                    className: 'rule-description',
                    text: args.type.description,
                }),
                FormControls.field({
                    label: 'Name',
                    control: FormControls.textInput({
                        value: this._draft.name,
                        placeholder: args.type.label,
                        onInput: value => this.change({
                            name: value,
                        }),
                    }),
                }),
                FormControls.toggleSwitch({
                    checked: this._draft.enabled,
                    label: 'Enabled',
                    onChange: isEnabled => this.change({
                        enabled: isEnabled,
                    }),
                }),
                section(
                    /* title: */ 'If',
                    /* children: */ new CriteriaBuilder(this._draft.criteria, criteria => this.change({
                        criteria,
                    })).root,
                ),
                section(
                    /* title: */ 'Then',
                    /* children: */ new ActionForm({
                        type: args.type,
                        action: this._draft.action,
                        fileClient: args.fileClient,
                        notifier: args.context.notifier,
                        onChange: action => this.change({
                            action,
                        }),
                    }).root,
                ),
                this._scope,
                this._errors,
                buildElement('div', {
                    className: 'actions',
                    children: [
                        FormControls.button({
                            text: 'Save rule',
                            variant: BUTTON_VARIANTS.Primary,
                            onClick: () => args.onSave(structuredClone(this._draft)),
                        }),
                        FormControls.button({
                            text: 'Cancel',
                            variant: BUTTON_VARIANTS.Ghost,
                            onClick: () => args.onCancel(),
                        }),
                    ],
                }),
                buildElement('details', {
                    className: 'editor-section editor-tester',
                    children: [
                        buildElement('summary', {
                            className: 'editor-section-title',
                            text: 'Test this rule',
                        }),
                        this._tester.root,
                    ],
                }),
            ],
        });
        this.refresh();
    }

    private change(patch: Partial<Rule>): void {
        this._draft = {
            ...this._draft,
            ...patch,
        };
        this.refresh();
        this._tester.refresh();
    }

    private plan(): RulePlan {
        return RuleScopes.planOf(
            /* rule: */ {
                ...this._draft,
                enabled: true,
            },
            /* context: */ RuleScopes.contextOf(this._settingsService.current()),
        );
    }

    private refresh(): void {
        const plan = this.plan();
        const appearance = SCOPE_APPEARANCES[plan.engine];
        this._scope.replaceChildren(
            /* nodes: */ buildElement('span', {
                className: `scope-badge ${appearance.className}`,
                text: appearance.label,
            }),
            /* nodes: */ plan.errors.length === 0 ? ` ${plan.reason}` : '',
        );
        this._errors.replaceChildren(...plan.errors.map(error => buildElement('li', {
            text: error,
        })));
        this._errors.hidden = plan.errors.length === 0;
    }
}
