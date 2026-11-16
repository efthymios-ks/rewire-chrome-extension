import { RuleTester } from '../../../Common/Rules/Engine/RuleTester';
import type { RuleType } from '../../../Common/Rules/Types/RuleType';
import { RuleTypeRegistry } from '../../../Common/Rules/Types/RuleTypeRegistry';
import type { Rule } from '../../../Contracts/Rules/Rule';
import { ChromeFileClient } from '../../Core/ChromeFileClient';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import type { SlidePanel } from '../../Core/Dom/SlidePanel';
import type { RuleEditRequest } from '../../Core/RuleEditRequest';
import { ProfilesPanel } from '../Profiles/ProfilesPanel';
import { ProfileTransferPanel } from '../Profiles/Transfer/ProfileTransferPanel';
import { VariablesPanel } from '../Profiles/Variables/VariablesPanel';
import type { PanelContext } from '../Shell/PanelContext';
import { RuleCatalog } from './Editor/RuleCatalog';
import { RuleEditor } from './Editor/RuleEditor';
import { SlideOver } from './Editor/SlideOver';
import { RuleFactory } from './RuleFactory';
import type { RuleFilter } from './RuleFilter';
import { RuleList } from './RuleList';
import { RuleScopes } from './RuleScopes';
import { RuleTesterPanel } from './Tester/RuleTesterPanel';

export interface SlideButtonOptions {
    text: string;
    title: string;
    create: () => SlidePanel;
}

export interface OpenEditorOptions {
    type: RuleType;
    rule: Rule;
    isNew: boolean;
}

export class RulesView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _slideOver = new SlideOver('Rule editor');
    private readonly _fileClient = new ChromeFileClient();
    private readonly _list: RuleList;

    constructor(context: PanelContext) {
        this._context = context;
        this._list = new RuleList(context, {
            text: '',
        });

        this.root = buildElement('section', {
            className: 'rules-view',
            children: [
                this.toolbar(),
                this._list.root,
                this._slideOver.root,
            ],
        });

        context.store.select({
            selector: state => state.ruleEditRequest,
            listener: request => this.handleEditRequest(request),
        });
    }

    private toolbar(): HTMLElement {
        const search = FormControls.searchInput({
            value: '',
            placeholder: 'Search by name',
            ariaLabel: 'Search rules by name',
            className: 'rule-search',
            onInput: text => this.setFilter({
                text,
            }),
        });

        return buildElement('div', {
            className: 'rules-toolbar',
            children: [
                buildElement('div', {
                    className: 'rules-toolbar-row',
                    children: [
                        FormControls.button({
                            text: 'Add rule',
                            variant: BUTTON_VARIANTS.Primary,
                            onClick: () => this.openCatalog(),
                        }),
                        search,
                    ],
                }),
                buildElement('div', {
                    className: 'rules-toolbar-row',
                    children: [
                        FormControls.button({
                            text: 'Test rules',
                            variant: BUTTON_VARIANTS.Ghost,
                            title: 'Run a sample request through every enabled rule',
                            onClick: () => this.openGlobalTester(),
                        }),
                        this.slideButton({
                            text: 'Profiles',
                            title: 'Create, rename, duplicate or remove profiles',
                            create: () => new ProfilesPanel(this._context),
                        }),
                        this.slideButton({
                            text: 'Variables',
                            title: 'Type {{name}} values for the active profile',
                            create: () => new VariablesPanel(this._context),
                        }),
                        this.slideButton({
                            text: 'Import / export',
                            title: 'Save profiles to a JSON file or load them from one',
                            create: () => new ProfileTransferPanel(this._context, this._fileClient),
                        }),
                    ],
                }),
            ],
        });
    }

    private slideButton({ text, title, create }: SlideButtonOptions): HTMLButtonElement {
        return FormControls.button({
            text,
            variant: BUTTON_VARIANTS.Ghost,
            title,
            onClick: () => {
                const panel = create();
                this._slideOver.closeAll();
                this._slideOver.push({
                    title: text,
                    content: panel.root,
                    onClose: () => panel.dispose(),
                });
            },
        });
    }

    private setFilter(filter: RuleFilter): void {
        this._list.setFilter(filter);
    }

    private openCatalog(): void {
        this._slideOver.closeAll();
        this._slideOver.push({
            title: 'Add a rule',
            content: new RuleCatalog(type => this.openEditor({
                type,
                rule: RuleFactory.create(type),
                isNew: true,
            })).root,
        });
    }

    private openGlobalTester(): void {
        const settingsService = this._context.settingsService;
        const settings = settingsService.current();
        this._slideOver.closeAll();
        this._slideOver.push({
            title: 'Test every enabled rule',
            content: new RuleTesterPanel(
                /* sampleUrl: */ settings.testerSamples[0] ?? '',
                /* runner: */ input => RuleTester.testAll({
                    plans: RuleScopes.plansOf(settingsService.current()),
                    input,
                    context: RuleScopes.contextOf(settingsService.current()),
                }),
            ).root,
        });
    }

    private handleEditRequest(request: RuleEditRequest | null): void {
        if (request == null) {
            return;
        }

        this._context.ruleEditor.close();
        const type = RuleTypeRegistry.get(request.rule.type);
        if (type == null) {
            this._context.notifier.show(`Unknown rule type "${request.rule.type}".`);

            return;
        }

        this._slideOver.closeAll();
        this.openEditor({ type, rule: request.rule, isNew: request.isNew });
    }

    private openEditor({ type, rule, isNew }: OpenEditorOptions): void {
        const editor = new RuleEditor({
            context: this._context,
            fileClient: this._fileClient,
            type,
            rule,
            onSave: saved => {
                void this._context.settingsService.saveRuleAsync(saved);
                this._context.notifier.show(isNew ? `Added "${saved.name}".` : `Saved "${saved.name}".`);
                this._slideOver.closeAll();
            },
            onCancel: () => this._slideOver.pop(),
        });
        this._slideOver.push({
            title: isNew ? `New ${type.label} rule` : `Edit ${rule.name === '' ? type.label : rule.name}`,
            content: editor.root,
        });
    }
}
