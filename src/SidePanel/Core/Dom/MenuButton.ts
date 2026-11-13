import type { ContextMenu, ContextMenuItem } from "./ContextMenu";
import { buildElement } from "./ElementBuilder";
import { ButtonVariants } from "./FormControls";

export interface MenuButtonArguments {
    text: string;
    title: string;
    menu: ContextMenu;
    items: () => ContextMenuItem[];
}

export const MenuButton = {
    build(args: MenuButtonArguments): HTMLButtonElement {
        const button = buildElement("button", {
            className: ButtonVariants.Ghost,
            text: args.text,
            title: args.title,
            attributes: {
                type: "button",
                "aria-haspopup": "menu",
            },
        });
        button.addEventListener("click", event => {
            event.stopPropagation();
            const bounds = button.getBoundingClientRect();
            args.menu.open(
                args.items(),
                bounds.left,
                bounds.bottom
            );
        });

        return button;
    },
};
