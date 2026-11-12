import type { SearchQuery } from "../../../Contracts/Search/SearchQuery";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { FormControls } from "../../Core/Dom/FormControls";
import type { PanelContext } from "../Shell/PanelContext";
import { SearchStatusText } from "./SearchStatusText";

const EnterKey = "Enter";

function toggleChip(
    text: string,
    title: string,
    onClick: () => void
): HTMLButtonElement {
    return buildElement("button", {
        className: "chip",
        text,
        title,
        attributes: {
            type: "button",
        },
        listeners: {
            click: onClick,
        },
    });
}

function stepButton(
    glyph: string,
    title: string,
    onClick: () => void
): HTMLButtonElement {
    return buildElement("button", {
        className: "button button-ghost icon-button",
        text: glyph,
        title,
        attributes: {
            type: "button",
            "aria-label": title,
        },
        listeners: {
            click: onClick,
        },
    });
}

export class TrafficSearchBar {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        const search = context.trafficSearch;
        const current = (): SearchQuery => context.store.getState().search.query;
        const update = (patch: Partial<SearchQuery>): void => search.setQuery({
            ...current(),
            ...patch,
        });

        const input = FormControls.textInput({
            value: current().text,
            placeholder: "Search URLs, headers, bodies",
            className: "input traffic-search",
            onInput: text => update({
                text,
            }),
        });
        input.setAttribute("aria-label", "Search traffic");
        input.addEventListener("keydown", event => {
            if (event.key !== EnterKey) {
                return;
            }

            event.preventDefault();
            search.step(event.shiftKey ? -1 : 1);
        });

        const regexChip = toggleChip(
            ".*",
            "Regular expression",
            () => update({
                isRegex: !current().isRegex,
            })
        );
        const status = buildElement("span", {
            className: "search-status",
            attributes: {
                "aria-live": "polite",
            },
        });

        const previousButton = stepButton(
            "↑",
            "Previous match (Shift+Enter)",
            () => search.step(-1)
        );
        const nextButton = stepButton(
            "↓",
            "Next match (Enter)",
            () => search.step(1)
        );

        this.root = buildElement("div", {
            className: "traffic-search-bar",
            children: [
                input,
                status,
                previousButton,
                nextButton,
                regexChip,
            ],
        });

        context.store.select(
            state => state.search,
            state => {
                regexChip.setAttribute("aria-pressed", String(state.query.isRegex));
                status.classList.toggle("form-error", state.error !== null);
                status.textContent = SearchStatusText.of(state);
                previousButton.disabled = state.matches.length === 0;
                nextButton.disabled = state.matches.length === 0;
            }
        );
    }
}
