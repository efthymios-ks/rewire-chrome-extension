import { buildElement } from '../../Core/Dom/buildElement';
import { Equalities } from '../../Core/Equalities';
import type { PanelContext } from '../Shell/PanelContext';

const SWITCHER_LABEL = 'Profile';
const SWITCHER_TITLE = 'The profile whose rules and variables are on';

export class ProfileSwitcher {
    readonly root: HTMLSelectElement;

    constructor(context: PanelContext) {
        this.root = buildElement('select', {
            className: 'input profile-select',
            title: SWITCHER_TITLE,
            attributes: {
                'aria-label': SWITCHER_LABEL,
            },
            listeners: {
                change: () => void context.settingsService.switchProfileAsync(this.root.value),
            },
        });

        context.store.select({
            selector: state => [
                state.settings.profiles,
                state.settings.activeProfileId,
            ],
            listener: () => this.render(context),
            isEqual: Equalities.shallowArray,
        });
    }

    private render(context: PanelContext): void {
        const settings = context.store.getState().settings;
        this.root.replaceChildren(...settings.profiles.map(profile => buildElement('option', {
            text: profile.name,
            attributes: {
                value: profile.id,
            },
        })));
        this.root.value = settings.activeProfileId;
    }
}
