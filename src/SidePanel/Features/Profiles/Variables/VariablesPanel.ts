import { ActiveProfile } from "../../../../Common/Profiles/ActiveProfile";
import { VariableNames } from "../../../../Common/Rules/Templates/VariableNames";
import type { ProfileVariable } from "../../../../Contracts/Settings/ProfileVariable";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../../Core/Dom/FormControls";
import type { ISlidePanel } from "../../../Core/Dom/ISlidePanel";
import { CountText } from "../../../Core/Formatting/CountText";
import type { PanelContext } from "../../Shell/PanelContext";

const MissingNameText = "Every variable with a value needs a name.";

function isBlank(variable: ProfileVariable): boolean {
    return variable.name.trim() === "" && variable.value === "";
}

function errorsOf(variables: ProfileVariable[]): string[] {
    const names = variables.map(variable => variable.name.trim());
    const invalid = names.filter(name => name !== "" && !VariableNames.isValid(name));
    const repeated = names.filter((name, index) => names.indexOf(name) !== index);

    return [
        ...(names.includes("") ? [MissingNameText] : []),
        ...invalid.map(name => `"${name}": ${VariableNames.Rule}`),
        ...[...new Set(repeated)].map(name => `"${name}" is listed more than once.`),
    ];
}

export class VariablesPanel implements ISlidePanel {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _intro: HTMLElement;
    private readonly _rows: HTMLElement;
    private readonly _errors: HTMLElement;
    private readonly _captured: HTMLElement;
    private readonly _unsubscribes: Array<() => void>;
    private _draft: ProfileVariable[] = [];

    constructor(context: PanelContext) {
        this._context = context;
        this._intro = buildElement("p", {
            className: "muted",
        });
        this._rows = buildElement("div", {
            className: "variable-rows",
        });
        this._errors = buildElement("ul", {
            className: "form-error",
        });
        this._captured = buildElement("div", {
            className: "captured-variables",
        });

        this.root = buildElement("div", {
            className: "variables-panel",
            children: [
                this._intro,
                this._rows,
                buildElement("div", {
                    className: "actions",
                    children: [
                        FormControls.button({
                            text: "Add variable",
                            onClick: () => this.add(),
                        }),
                        FormControls.button({
                            text: "Save variables",
                            variant: ButtonVariants.Primary,
                            onClick: () => void this.save(),
                        }),
                    ],
                }),
                this._errors,
                buildElement("h3", {
                    className: "editor-section-title",
                    text: "Captured this session",
                }),
                this._captured,
            ],
        });

        this._unsubscribes = [
            context.store.select(
                state => state.settings.activeProfileId,
                () => this.load()
            ),
            context.store.select(
                state => state.capturedVariables,
                variables => this.renderCaptured(variables)
            ),
        ];
    }

    dispose(): void {
        this._unsubscribes.forEach(unsubscribe => unsubscribe());
    }

    private load(): void {
        const profile = ActiveProfile.of(this._context.store.getState().settings);
        this._intro.textContent = `Variables of "${profile.name}". Rules use them as {{name}}. A value a Set variable rule captures wins over the one typed here.`;
        this._draft = profile.variables.map(variable => ({
            ...variable,
        }));
        this._errors.replaceChildren();
        this.renderRows();
    }

    private add(): void {
        this._draft = [
            ...this._draft,
            {
                name: "",
                value: "",
            },
        ];
        this.renderRows();
        this._rows.querySelector<HTMLInputElement>(".variable-row:last-child .variable-name")?.focus();
    }

    private renderRows(): void {
        if (this._draft.length === 0) {
            this._rows.replaceChildren(buildElement("p", {
                className: "muted",
                text: "No variables yet.",
            }));

            return;
        }

        this._rows.replaceChildren(...this._draft.map((variable, index) => this.row(variable, index)));
    }

    private row(variable: ProfileVariable, index: number): HTMLElement {
        const nameInput = FormControls.textInput({
            value: variable.name,
            placeholder: "Name",
            className: "input variable-name",
            onInput: name => this.change(index, {
                ...this._draft[index]!,
                name,
            }),
        });
        nameInput.setAttribute("aria-label", "Variable name");
        const valueInput = FormControls.textInput({
            value: variable.value,
            placeholder: "Value",
            className: "input variable-value",
            onInput: value => this.change(index, {
                ...this._draft[index]!,
                value,
            }),
        });
        valueInput.setAttribute("aria-label", "Variable value");

        return buildElement("div", {
            className: "variable-row",
            children: [
                nameInput,
                valueInput,
                FormControls.button({
                    text: "×",
                    variant: ButtonVariants.Ghost,
                    title: "Remove this variable",
                    onClick: () => this.remove(index),
                }),
            ],
        });
    }

    private change(index: number, variable: ProfileVariable): void {
        this._draft = this._draft.map((current, currentIndex) => currentIndex === index ? variable : current);
    }

    private remove(index: number): void {
        this._draft = this._draft.filter((_variable, currentIndex) => currentIndex !== index);
        this.renderRows();
    }

    private async save(): Promise<void> {
        const variables = this._draft
            .filter(variable => !isBlank(variable))
            .map(variable => ({
                name: variable.name.trim(),
                value: variable.value,
            }));
        const errors = errorsOf(variables);
        this._errors.replaceChildren(...errors.map(error => buildElement("li", {
            text: error,
        })));
        if (errors.length > 0) {
            return;
        }

        const saved = await this._context.settingsService.saveVariables(variables);
        if (saved.hasErrors) {
            return;
        }

        this._context.notifier.show(`Saved ${CountText.of(variables.length, "variable")}.`);
        this.load();
    }

    private renderCaptured(variables: ProfileVariable[]): void {
        if (variables.length === 0) {
            this._captured.replaceChildren(buildElement("p", {
                className: "muted",
                text: "None yet. Set variable rules fill this list while they run; it empties when the browser restarts.",
            }));

            return;
        }

        this._captured.replaceChildren(buildElement("dl", {
            className: "definitions",
            children: variables.flatMap(variable => [
                buildElement("dt", {
                    className: "code-text",
                    text: variable.name,
                }),
                buildElement("dd", {
                    className: "code-text",
                    text: variable.value,
                }),
            ]),
        }));
    }
}
