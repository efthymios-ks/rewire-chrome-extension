import type { IRuleType } from "../../../../Common/Rules/Types/IRuleType";
import { RuleTypeRegistry } from "../../../../Common/Rules/Types/RuleTypeRegistry";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { FormControls } from "../../../Core/Dom/FormControls";

function matches(type: IRuleType, text: string): boolean {
    const needle = text.trim().toLowerCase();

    return needle === "" || `${type.label} ${type.description}`.toLowerCase().includes(needle);
}

export class RuleCatalog {
    readonly root: HTMLElement;

    private readonly _groups: HTMLElement;
    private readonly _onPick: (type: IRuleType) => void;

    constructor(onPick: (type: IRuleType) => void) {
        this._onPick = onPick;
        this._groups = buildElement("div", {
            className: "catalog-groups",
        });
        const search = FormControls.textInput({
            value: "",
            placeholder: "Search rule types",
            onInput: value => this.render(value),
        });
        search.setAttribute("aria-label", "Search rule types");

        this.root = buildElement("div", {
            className: "rule-catalog",
            children: [
                search,
                this._groups,
            ],
        });
        this.render("");
    }

    private render(text: string): void {
        const groups = RuleTypeRegistry
            .groups()
            .map(group => ({
                ...group,
                types: group.types.filter(type => matches(type, text)),
            }))
            .filter(group => group.types.length > 0);

        this._groups.replaceChildren(...groups.map(group => buildElement("section", {
            className: "catalog-group",
            children: [
                buildElement("h3", {
                    className: "catalog-group-title",
                    text: group.label,
                }),
                buildElement("div", {
                    className: "catalog-items",
                    children: group.types.map(type => buildElement("button", {
                        className: "catalog-item",
                        attributes: {
                            type: "button",
                        },
                        listeners: {
                            click: () => this._onPick(type),
                        },
                        children: [
                            buildElement("strong", {
                                text: type.label,
                            }),
                            buildElement("span", {
                                className: "muted",
                                text: type.description,
                            }),
                        ],
                    })),
                }),
            ],
        })));
    }
}
