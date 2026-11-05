import { PanelThemes } from "./PanelTheme";
import type { PanelState } from "./PanelState";
import type { Store } from "./Store";

const ThemeAttribute = "theme";

export const ThemeApplier = {
    start(store: Store<PanelState>): void {
        store.select(
            state => state.theme,
            theme => {
                const root = document.documentElement;
                if (theme === PanelThemes.System) {
                    delete root.dataset[ThemeAttribute];

                    return;
                }

                root.dataset[ThemeAttribute] = theme;
            }
        );
    },
};
