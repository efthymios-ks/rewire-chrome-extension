import { RuleTester } from "../../../../Common/Rules/Engine/RuleTester";
import type { RulePlan } from "../../../../Common/Rules/Engine/RulePlan";
import type { IRuleType } from "../../../../Common/Rules/Types/IRuleType";
import type { Rule } from "../../../../Contracts/Rules/Rule";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../../Core/Dom/FormControls";
import type { IFileClient } from "../../../Core/FileClient";
import type { SettingsService } from "../../../Core/SettingsService";
import type { PanelContext } from "../../Shell/PanelContext";
import { RuleScopes, ScopeAppearances } from "../RuleScopes";
import { RuleTesterPanel } from "../Tester/RuleTesterPanel";
import { ActionForm } from "./ActionForm";
import { CriteriaBuilder } from "./CriteriaBuilder";

export interface RuleEditorArguments {
    context: PanelContext;
    fileClient: IFileClient;
    type: IRuleType;
    rule: Rule;
    onSave: (rule: Rule) => void;
    onCancel: () => void;
}

function section(title: string, ...children: HTMLElement[]): HTMLElement {
    return buildElement("section", {
        className: "editor-section",
        children: [
            buildElement("h3", {
                className: "editor-section-title",
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
    private readonly _saveButton: HTMLButtonElement;
    private _draft: Rule;

    constructor(args: RuleEditorArguments) {
        this._draft = structuredClone(args.rule);
        this._settingsService = args.context.settingsService;
        this._scope = buildElement("p", {
            className: "editor-scope",
        });
        this._errors = buildElement("ul", {
            className: "form-error",
        });
        const settings = args.context.settingsService.current();
        this._tester = new RuleTesterPanel(
            settings.testerSamples[0] ?? "",
            input => RuleTester.testRule(
                this.plan(),
                input,
                RuleScopes.contextOf(this._settingsService.current())
            )
        );
        this._saveButton = FormControls.button({
            text: "Save rule",
            variant: ButtonVariants.Primary,
            onClick: () => args.onSave(structuredClone(this._draft)),
        });

        this.root = buildElement("div", {
            className: "rule-editor",
            children: [
                buildElement("p", {
                    className: "muted",
                    text: args.type.description,
                }),
                FormControls.field(
                    "Name",
                    FormControls.textInput({
                        value: this._draft.name,
                        placeholder: args.type.label,
                        onInput: value => this.change({
                            name: value,
                        }),
                    })
                ),
                FormControls.toggleSwitch({
                    checked: this._draft.enabled,
                    label: "Enabled",
                    onChange: enabled => this.change({
                        enabled,
                    }),
                }),
                section(
                    "If",
                    new CriteriaBuilder(this._draft.criteria, criteria => this.change({
                        criteria,
                    })).root
                ),
                section(
                    "Then",
                    new ActionForm({
                        type: args.type,
                        action: this._draft.action,
                        fileClient: args.fileClient,
                        notifier: args.context.notifier,
                        onChange: action => this.change({
                            action,
                        }),
                    }).root
                ),
                this._scope,
                this._errors,
                buildElement("div", {
                    className: "actions",
                    children: [
                        this._saveButton,
                        FormControls.button({
                            text: "Cancel",
                            variant: ButtonVariants.Ghost,
                            onClick: () => args.onCancel(),
                        }),
                    ],
                }),
                buildElement("details", {
                    className: "editor-section editor-tester",
                    children: [
                        buildElement("summary", {
                            className: "editor-section-title",
                            text: "Test this rule",
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
            {
                ...this._draft,
                enabled: true,
            },
            RuleScopes.contextOf(this._settingsService.current())
        );
    }

    private refresh(): void {
        const plan = this.plan();
        const appearance = ScopeAppearances[plan.engine];
        this._scope.replaceChildren(
            buildElement("span", {
                className: `scope-badge ${appearance.className}`,
                text: appearance.label,
            }),
            plan.errors.length === 0 ? ` ${plan.reason}` : ""
        );
        this._errors.replaceChildren(...plan.errors.map(error => buildElement("li", {
            text: error,
        })));
        this._errors.hidden = plan.errors.length === 0;
    }
}
