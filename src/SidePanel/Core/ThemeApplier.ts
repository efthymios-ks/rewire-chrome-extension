import type { PanelState } from './PanelState';
import type { Store } from './Store';
import { ThemeResolver } from './ThemeResolver';
import { ThemeStorage } from './ThemeStorage';

const THEME_ATTRIBUTE = 'theme';

export const ThemeApplier = {
    start(store: Store<PanelState>): void {
        const apply = (): void => {
            const resolved = ThemeResolver.effective(
                /* theme: */ store.getState().theme,
                /* prefersDark: */ ThemeResolver.prefersDark(),
            );
            document.documentElement.dataset[THEME_ATTRIBUTE] = resolved;
        };

        store.update(state => ({
            ...state,
            theme: ThemeStorage.load(),
        }));
        store.select({
            selector: state => state.theme,
            listener: theme => {
                ThemeStorage.save(theme);
                apply();
            },
        });
        ThemeResolver.watchSystem(apply);
    },
};
