import { RuleTester } from "../../../Common/Rules/Engine/RuleTester";
import type { IRuleType } from "../../../Common/Rules/Types/IRuleType";
import { RuleTypeRegistry } from "../../../Common/Rules/Types/RuleTypeRegistry";
import type { Rule } from "../../../Contracts/Rules/Rule";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { FileClient } from "../../Core/FileClient";
import type { RuleEditRequest } from "../../Core/RuleEditRequest";
import type { PanelContext } from "../Shell/PanelContext";
import { RuleCatalog } from "./Editor/RuleCatalog";
import { RuleEditor } from "./Editor/RuleEditor";
import { SlideOver } from "./Editor/SlideOver";
import { RuleFactory } from "./RuleFactory";
import type { RuleFilter } from "./RuleFilter";
import { RuleList } from "./RuleList";
import { RuleScopes } from "./RuleScopes";
import { RuleTesterPanel } from "./Tester/RuleTesterPanel";
import { TransferPanel } from "./Transfer/TransferPanel";

export class RulesView {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _slideOver = new SlideOver("Rule editor");
    private readonly _fileClient = new FileClient();
    private readonly _list: RuleList;
    private _filter: RuleFilter = {
        text: "",
    };

    constructor(context: PanelContext) {
        this._context = context;
        this._list = new RuleList(context, this._filter);

        this.root = buildElement("section", {
            className: "rules-view",
            children: [
                this.toolbar(),
                this._list.root,
                this._slideOver.root,
            ],
        });

        context.store.select(
            state => state.ruleEditRequest,
            request => this.handleEditRequest(request)
        );
    }

    private toolbar(): HTMLElement {
        const search = FormControls.textInput({
            value: "",
            placeholder: "Search rules by name",
            className: "input rule-search",
            onInput: text => this.setFilter({
                text,
            }),
        });
        search.setAttribute("aria-label", "Search rules by name");

        return buildElement("div", {
            className: "rules-toolbar",
            children: [
                buildElement("div", {
                    className: "rules-toolbar-row",
                    children: [
                        FormControls.button({
                            text: "Add rule",
                            variant: ButtonVariants.Primary,
                            onClick: () => this.openCatalog(),
                        }),
                        search,
                    ],
                }),
                buildElement("div", {
                    className: "rules-toolbar-row",
                    children: [
                        FormControls.button({
                            text: "Test rules",
                            variant: ButtonVariants.Ghost,
                            title: "Run a sample request through every enabled rule",
                            onClick: () => this.openGlobalTester(),
                        }),
                        FormControls.button({
                            text: "Import / export",
                            variant: ButtonVariants.Ghost,
                            onClick: () => this._slideOver.push({
                                title: "Import / export",
                                content: new TransferPanel(this._context, this._fileClient).root,
                            }),
                        }),
                    ],
                }),
            ],
        });
    }

    private setFilter(filter: RuleFilter): void {
        this._filter = filter;
        this._list.setFilter(filter);
    }

    private openCatalog(): void {
        this._slideOver.closeAll();
        this._slideOver.push({
            title: "Add a rule",
            content: new RuleCatalog(type => this.openEditor(
                type,
                RuleFactory.create(type),
                true
            )).root,
        });
    }

    private openGlobalTester(): void {
        const settingsService = this._context.settingsService;
        const settings = settingsService.current();
        this._slideOver.closeAll();
        this._slideOver.push({
            title: "Test every enabled rule",
            content: new RuleTesterPanel(
                settings.testerSamples[0] ?? "",
                input => RuleTester.testAll(
                    RuleScopes.plansOf(settingsService.current()),
                    input,
                    RuleScopes.contextOf()
                )
            ).root,
        });
    }

    private handleEditRequest(request: RuleEditRequest | null): void {
        if (request === null) {
            return;
        }

        this._context.ruleEditor.close();
        const type = RuleTypeRegistry.get(request.rule.type);
        if (type === undefined) {
            this._context.notifier.show(`Unknown rule type "${request.rule.type}".`);

            return;
        }

        this._slideOver.closeAll();
        this.openEditor(
            type,
            request.rule,
            request.isNew
        );
    }

    private openEditor(
        type: IRuleType,
        rule: Rule,
        isNew: boolean
    ): void {
        const editor = new RuleEditor({
            context: this._context,
            fileClient: this._fileClient,
            type,
            rule,
            onSave: saved => {
                void this._context.settingsService.saveRule(saved);
                this._context.notifier.show(isNew ? `Added "${saved.name}".` : `Saved "${saved.name}".`);
                this._slideOver.closeAll();
            },
            onCancel: () => this._slideOver.pop(),
        });
        this._slideOver.push({
            title: isNew ? `New ${type.label} rule` : `Edit ${rule.name || type.label}`,
            content: editor.root,
        });
    }
}
