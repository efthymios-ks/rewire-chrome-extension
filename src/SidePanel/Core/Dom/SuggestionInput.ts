import { buildElement } from "./ElementBuilder";
import { FormControls } from "./FormControls";

export interface SuggestionInputArguments {
    value: string;
    placeholder: string;
    suggestions: readonly string[];
    onInput: (value: string) => void;
    className?: string;
}

const DefaultInputClass = "input";

let nextListId = 1;

export const SuggestionInput = {
    build(args: SuggestionInputArguments): HTMLElement {
        const listId = `suggestions-${nextListId++}`;
        const input = FormControls.textInput({
            value: args.value,
            placeholder: args.placeholder,
            onInput: args.onInput,
            className: args.className ?? DefaultInputClass,
        });
        input.setAttribute("list", listId);
        input.autocomplete = "off";

        return buildElement("span", {
            className: "suggestion-input",
            children: [
                input,
                buildElement("datalist", {
                    attributes: {
                        id: listId,
                    },
                    children: args.suggestions.map(suggestion => buildElement("option", {
                        attributes: {
                            value: suggestion,
                        },
                    })),
                }),
            ],
        });
    },
};
