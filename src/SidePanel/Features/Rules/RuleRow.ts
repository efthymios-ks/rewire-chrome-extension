import type { RulePlan } from "../../../Common/Rules/Engine/RulePlan";
import type { Rule } from "../../../Contracts/Rules/Rule";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import { RuleScopes, ScopeAppearances } from "./RuleScopes";

const DragHandleGlyph = "⠿";
const MoveKeys: Record<string, number> = {
    ArrowUp: -1,
    ArrowDown: 1,
};

export interface RuleRowActions {
    onToggle(rule: Rule, enabled: boolean): void;
    onEdit(rule: Rule): void;
    onDuplicate(rule: Rule): void;
    onRemove(rule: Rule): void;
    onMove(rule: Rule, offset: number): void;
    onDrop(draggedRuleId: string, target: Rule): void;
}

export interface RuleRowModel {
    rule: Rule;
    plan: RulePlan;
    typeLabel: string;
    hits: number;
}

const DragDataType = "text/plain";

export const RuleRow = {
    build(model: RuleRowModel, actions: RuleRowActions): HTMLLIElement {
        const { rule, plan } = model;
        const appearance = ScopeAppearances[plan.engine];
        const handle = buildElement("button", {
            className: "drag-handle",
            text: DragHandleGlyph,
            title: "Drag, or focus and press the arrow keys, to reorder",
            attributes: {
                type: "button",
                "aria-label": `Reorder ${rule.name}`,
            },
            listeners: {
                keydown: event => {
                    const offset = MoveKeys[event.key];
                    if (offset === undefined) {
                        return;
                    }

                    event.preventDefault();
                    actions.onMove(rule, offset);
                },
            },
        });

        const row = buildElement("li", {
            className: rule.enabled ? "rule-row" : "rule-row disabled",
            attributes: {
                draggable: "true",
                "data-rule-id": rule.id,
            },
            listeners: {
                dragstart: event => {
                    event.dataTransfer?.setData(DragDataType, rule.id);
                    row.classList.add("dragging");
                },
                dragend: () => row.classList.remove("dragging"),
                dragover: event => {
                    event.preventDefault();
                    row.classList.add("drop-target");
                },
                dragleave: () => row.classList.remove("drop-target"),
                drop: event => {
                    event.preventDefault();
                    row.classList.remove("drop-target");
                    const draggedRuleId = event.dataTransfer?.getData(DragDataType) ?? "";
                    if (draggedRuleId !== "" && draggedRuleId !== rule.id) {
                        actions.onDrop(draggedRuleId, rule);
                    }
                },
            },
            children: [
                handle,
                FormControls.toggleSwitch({
                    checked: rule.enabled,
                    label: "",
                    onChange: enabled => actions.onToggle(rule, enabled),
                }),
                buildElement("div", {
                    className: "rule-main",
                    children: [
                        buildElement("div", {
                            className: "rule-title",
                            children: [
                                buildElement("span", {
                                    className: "rule-name",
                                    text: rule.name || model.typeLabel,
                                }),
                                buildElement("span", {
                                    className: "type-badge",
                                    text: model.typeLabel,
                                }),
                                buildElement("span", {
                                    className: `scope-badge ${appearance.className}`,
                                    text: appearance.label,
                                    title: [
                                        plan.reason,
                                        ...plan.errors,
                                    ].join("\n"),
                                }),
                                buildElement("span", {
                                    className: "hit-count",
                                    text: String(model.hits),
                                    title: `${model.hits} hits since the browser started`,
                                }),
                            ],
                        }),
                        buildElement("div", {
                            className: "rule-target",
                            text: RuleScopes.criteriaSummary(rule),
                            title: RuleScopes.criteriaSummary(rule),
                        }),
                    ],
                }),
                buildElement("div", {
                    className: "row-actions",
                    children: [
                        FormControls.button({
                            text: "Edit",
                            variant: ButtonVariants.Ghost,
                            onClick: () => actions.onEdit(rule),
                        }),
                        FormControls.button({
                            text: "Duplicate",
                            variant: ButtonVariants.Ghost,
                            onClick: () => actions.onDuplicate(rule),
                        }),
                        FormControls.button({
                            text: "Remove",
                            variant: ButtonVariants.Ghost,
                            onClick: () => actions.onRemove(rule),
                        }),
                    ],
                }),
            ],
        });
        row.querySelector(".switch input")?.setAttribute("aria-label", `Enable ${rule.name}`);

        return row;
    },
};
