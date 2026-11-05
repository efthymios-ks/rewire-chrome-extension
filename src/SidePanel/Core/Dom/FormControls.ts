import { buildElement } from "./ElementBuilder";

export const ButtonVariants = {
    Default: "button",
    Primary: "button button-primary",
    Danger: "button button-danger",
    Ghost: "button button-ghost",
} as const;

export interface SelectOption {
    value: string;
    label: string;
}

export interface TextInputArguments {
    value: string;
    placeholder?: string;
    type?: string;
    className?: string;
    onInput?: (value: string) => void;
    onChange?: (value: string) => void;
}

export interface TextAreaArguments {
    value: string;
    rows: number;
    className?: string;
    placeholder?: string;
    onInput?: (value: string) => void;
    onChange?: (value: string) => void;
}

export interface CheckboxArguments {
    checked: boolean;
    label: string;
    className?: string;
    onChange: (checked: boolean) => void;
}

export interface SelectArguments {
    options: SelectOption[];
    value: string;
    className?: string;
    onChange: (value: string) => void;
}

export interface ButtonArguments {
    text: string;
    onClick: () => void;
    variant?: string;
    title?: string;
}

export const FormControls = {
    textInput(args: TextInputArguments): HTMLInputElement {
        const input = buildElement("input", {
            className: args.className ?? "input",
            attributes: {
                type: args.type ?? "text",
                placeholder: args.placeholder ?? "",
                spellcheck: "false",
            },
        });
        input.value = args.value;
        input.addEventListener("input", () => args.onInput?.(input.value));
        input.addEventListener("change", () => args.onChange?.(input.value));

        return input;
    },

    textArea(args: TextAreaArguments): HTMLTextAreaElement {
        const textArea = buildElement("textarea", {
            className: args.className ?? "input code-input",
            attributes: {
                rows: String(args.rows),
                placeholder: args.placeholder ?? "",
                spellcheck: "false",
            },
        });
        textArea.value = args.value;
        textArea.addEventListener("input", () => args.onInput?.(textArea.value));
        textArea.addEventListener("change", () => args.onChange?.(textArea.value));

        return textArea;
    },

    checkbox(args: CheckboxArguments): HTMLLabelElement {
        const input = buildElement("input", {
            attributes: {
                type: "checkbox",
            },
        });
        input.checked = args.checked;
        input.addEventListener("change", () => args.onChange(input.checked));

        return buildElement("label", {
            className: args.className ?? "checkbox",
            children: [
                input,
                buildElement("span", {
                    text: args.label,
                }),
            ],
        });
    },

    toggleSwitch(args: CheckboxArguments): HTMLLabelElement {
        const toggle = FormControls.checkbox({
            ...args,
            className: args.className ?? "switch",
        });
        toggle.querySelector("input")?.setAttribute("role", "switch");

        return toggle;
    },

    select(args: SelectArguments): HTMLSelectElement {
        const select = buildElement("select", {
            className: args.className ?? "input",
            children: args.options.map(option => buildElement("option", {
                text: option.label,
                attributes: {
                    value: option.value,
                },
            })),
        });
        select.value = args.value;
        select.addEventListener("change", () => args.onChange(select.value));

        return select;
    },

    button(args: ButtonArguments): HTMLButtonElement {
        return buildElement("button", {
            className: args.variant ?? ButtonVariants.Default,
            text: args.text,
            title: args.title ?? args.text,
            attributes: {
                type: "button",
            },
            listeners: {
                click: () => args.onClick(),
            },
        });
    },

    field(
        label: string,
        control: HTMLElement,
        hint: string | null = null
    ): HTMLDivElement {
        return buildElement("div", {
            className: "field",
            children: [
                buildElement("span", {
                    className: "field-label",
                    text: label,
                }),
                control,
                hint === null
                    ? null
                    : buildElement("span", {
                        className: "field-hint",
                        text: hint,
                    }),
            ],
        });
    },
};
