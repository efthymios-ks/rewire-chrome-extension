import { buildElement } from "./ElementBuilder";

export interface PickChoice {
    key: string;
    label: string;
}

export interface PickListArguments {
    label: string;
    choices: PickChoice[];
    excluded: string[];
    onChange: (excluded: string[]) => void;
}

const AllLabel = "All";

function checkboxRow(text: string, title: string): { row: HTMLLabelElement; input: HTMLInputElement } {
    const input = buildElement("input", {
        attributes: {
            type: "checkbox",
        },
    });
    const row = buildElement("label", {
        className: "checkbox pick-item",
        title,
        children: [
            input,
            buildElement("span", {
                text,
            }),
        ],
    });

    return {
        row,
        input,
    };
}

export const PickList = {
    build(args: PickListArguments): HTMLDetailsElement {
        let excluded = args.excluded.filter(key => args.choices.some(choice => choice.key === key));
        const summary = buildElement("summary", {
            className: "pick-summary",
        });
        const all = checkboxRow(AllLabel, `Every ${args.label.toLowerCase()} item`);
        const items = args.choices.map(choice => ({
            choice,
            ...checkboxRow(choice.label, choice.label),
        }));
        const render = (): void => {
            const selected = args.choices.length - excluded.length;
            summary.textContent = `${args.label} ${selected}/${args.choices.length}`;
            all.input.checked = excluded.length === 0;
            all.input.indeterminate = excluded.length > 0 && selected > 0;
            items.forEach(item => {
                item.input.checked = !excluded.includes(item.choice.key);
            });
        };
        const publish = (next: string[]): void => {
            excluded = next;
            render();
            args.onChange([...excluded]);
        };

        all.input.addEventListener("change", () => publish(all.input.checked ? [] : args.choices.map(choice => choice.key)));
        items.forEach(item => item.input.addEventListener("change", () => publish(item.input.checked
            ? excluded.filter(key => key !== item.choice.key)
            : [
                ...excluded,
                item.choice.key,
            ])));

        const root = buildElement("details", {
            className: "pick-list",
            children: [
                summary,
                buildElement("div", {
                    className: "pick-panel",
                    children: [
                        all.row,
                        ...items.map(item => item.row),
                    ],
                }),
            ],
        });
        const closeOutside = (event: PointerEvent): void => {
            if (!root.contains(event.target as Node)) {
                root.open = false;
            }
        };
        root.addEventListener("toggle", () => {
            if (root.open) {
                document.addEventListener("pointerdown", closeOutside);

                return;
            }

            document.removeEventListener("pointerdown", closeOutside);
        });
        render();

        return root;
    },
};
