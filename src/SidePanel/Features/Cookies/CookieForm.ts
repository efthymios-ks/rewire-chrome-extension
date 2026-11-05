import { buildElement } from "../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../Core/Dom/FormControls";
import type { CookieDraft } from "./CookieDraft";

const ValueRows = 3;

const SameSiteOptions: Array<{ value: CookieDraft["sameSite"]; label: string }> = [
    {
        value: "unspecified",
        label: "Not set (Lax)",
    },
    {
        value: "lax",
        label: "Lax",
    },
    {
        value: "strict",
        label: "Strict",
    },
    {
        value: "no_restriction",
        label: "None",
    },
];

export interface CookieFormArguments {
    draft: CookieDraft;
    isUnsaved: boolean;
    onSave(draft: CookieDraft): void;
    onCancel(): void;
}

export class CookieForm {
    readonly root: HTMLElement;

    private _draft: CookieDraft;
    private readonly _error: HTMLElement;

    constructor(args: CookieFormArguments) {
        this._draft = {
            ...args.draft,
        };
        this._error = buildElement("p", {
            className: "form-error",
        });

        const nameInput = FormControls.textInput({
            value: this._draft.name,
            className: "input code-text",
            onInput: value => this.change({
                name: value,
            }),
        });
        nameInput.readOnly = !args.isUnsaved;

        const expiresInput = FormControls.textInput({
            value: this._draft.expiresAt,
            type: "datetime-local",
            onInput: value => this.change({
                expiresAt: value,
            }),
        });

        this.root = buildElement("form", {
            className: "rule-editor",
            listeners: {
                submit: event => event.preventDefault(),
            },
            children: [
                FormControls.field("Name", nameInput),
                FormControls.field(
                    "Value",
                    FormControls.textArea({
                        value: this._draft.value,
                        rows: ValueRows,
                        onInput: value => this.change({
                            value,
                        }),
                    })
                ),
                buildElement("div", {
                    className: "field-row",
                    children: [
                        FormControls.field(
                            "Domain",
                            FormControls.textInput({
                                value: this._draft.domain,
                                onInput: value => this.change({
                                    domain: value.trim(),
                                }),
                            })
                        ),
                        FormControls.field(
                            "Path",
                            FormControls.textInput({
                                value: this._draft.path,
                                onInput: value => this.change({
                                    path: value.trim(),
                                }),
                            })
                        ),
                    ],
                }),
                buildElement("div", {
                    className: "field-row",
                    children: [
                        FormControls.field(
                            "Expires",
                            expiresInput,
                            "Empty makes a session cookie."
                        ),
                        FormControls.field(
                            "SameSite",
                            FormControls.select({
                                value: this._draft.sameSite,
                                options: SameSiteOptions,
                                onChange: value => this.change({
                                    sameSite: value as CookieDraft["sameSite"],
                                }),
                            })
                        ),
                    ],
                }),
                buildElement("div", {
                    className: "field-row",
                    children: [
                        FormControls.checkbox({
                            checked: this._draft.hostOnly,
                            label: "Host only",
                            onChange: checked => this.change({
                                hostOnly: checked,
                            }),
                        }),
                        FormControls.checkbox({
                            checked: this._draft.secure,
                            label: "Secure",
                            onChange: checked => this.change({
                                secure: checked,
                            }),
                        }),
                        FormControls.checkbox({
                            checked: this._draft.httpOnly,
                            label: "HttpOnly",
                            onChange: checked => this.change({
                                httpOnly: checked,
                            }),
                        }),
                    ],
                }),
                this._error,
                buildElement("div", {
                    className: "actions",
                    children: [
                        FormControls.button({
                            text: "Save",
                            variant: ButtonVariants.Primary,
                            onClick: () => this.save(args),
                        }),
                        FormControls.button({
                            text: "Cancel",
                            onClick: () => args.onCancel(),
                        }),
                    ],
                }),
            ],
        });
    }

    showError(message: string): void {
        this._error.textContent = message;
    }

    private change(patch: Partial<CookieDraft>): void {
        this._draft = {
            ...this._draft,
            ...patch,
        };
    }

    private save(args: CookieFormArguments): void {
        if (this._draft.name.trim() === "" || this._draft.domain === "") {
            this.showError("Name and domain are required.");

            return;
        }

        this.showError("");
        args.onSave(this._draft);
    }
}
