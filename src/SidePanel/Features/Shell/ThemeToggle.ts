import { buildElement } from '../../Core/Dom/buildElement';
import { type PanelTheme, PANEL_THEMES, type ResolvedTheme } from '../../Core/PanelTheme';
import { ThemeResolver } from '../../Core/ThemeResolver';
import type { PanelContext } from './PanelContext';

interface ThemeAppearance {
    glyph: string;
    title: string;
}

const APPEARANCES: Record<ResolvedTheme, ThemeAppearance> = {
    [PANEL_THEMES.Light]: {
        glyph: '☾',
        title: 'Switch to the dark theme',
    },
    [PANEL_THEMES.Dark]: {
        glyph: '☀',
        title: 'Switch to the light theme',
    },
};

export class ThemeToggle {
    readonly root: HTMLButtonElement;

    constructor(context: PanelContext) {
        this.root = buildElement('button', {
            className: 'button button-ghost button-icon theme-toggle',
            attributes: {
                type: 'button',
            },
            listeners: {
                click: () => context.store.update(state => ({
                    ...state,
                    theme: ThemeResolver.toggled(
                        /* theme: */ state.theme,
                        /* prefersDark: */ ThemeResolver.prefersDark(),
                    ),
                })),
            },
        });

        const render = (theme: PanelTheme): void => {
            const appearance = APPEARANCES[ThemeResolver.effective(
                /* theme: */ theme,
                /* prefersDark: */ ThemeResolver.prefersDark(),
            )];
            this.root.textContent = appearance.glyph;
            this.root.title = appearance.title;
            this.root.setAttribute('aria-label', appearance.title);
        };

        context.store.select({
            selector: state => state.theme,
            listener: render,
        });
        ThemeResolver.watchSystem(() => render(context.store.getState().theme));
    }
}
