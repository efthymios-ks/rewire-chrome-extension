import { buildElement } from './buildElement';
import { BUTTON_VARIANTS } from './ButtonVariants';
import type { ContextMenu } from './ContextMenu';
import type { ContextMenuItem } from './ContextMenuItem';

export interface MenuButtonArguments {
    text: string;
    title: string;
    menu: ContextMenu;
    items: () => ContextMenuItem[];
}

export const MenuButton = {
    build(args: MenuButtonArguments): HTMLButtonElement {
        const button = buildElement('button', {
            className: BUTTON_VARIANTS.Ghost,
            text: args.text,
            title: args.title,
            attributes: {
                type: 'button',
                'aria-haspopup': 'menu',
            },
        });
        button.addEventListener(
            /* type: */ 'click',
            /* listener: */ event => {
                event.stopPropagation();
                const bounds = button.getBoundingClientRect();
                args.menu.open({
                    items: args.items(),
                    clientX: bounds.left,
                    clientY: bounds.bottom,
                });
            },
        );

        return button;
    },
};
