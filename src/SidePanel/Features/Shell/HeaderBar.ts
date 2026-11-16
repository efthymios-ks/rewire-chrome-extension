import { SafeUrl } from '../../../Common/Urls/SafeUrl';
import { INSPECTION_STATE, type InspectionState } from '../../../Contracts/Inspection/InspectionState';
import { buildElement } from '../../Core/Dom/buildElement';
import { BUTTON_VARIANTS } from '../../Core/Dom/ButtonVariants';
import { FormControls } from '../../Core/Dom/FormControls';
import { InputSync } from '../../Core/Dom/InputSync';
import type { InspectedTab } from '../../Core/InspectedTab';
import { ProfileSwitcher } from '../Profiles/ProfileSwitcher';
import type { PanelContext } from './PanelContext';
import { ThemeToggle } from './ThemeToggle';

const STATUS_LABELS: Record<InspectionState, string> = Object.freeze({
    [INSPECTION_STATE.Idle]: 'No tab',
    [INSPECTION_STATE.Attaching]: 'Attaching',
    [INSPECTION_STATE.Attached]: 'Capturing',
    [INSPECTION_STATE.Detached]: 'Detached',
    [INSPECTION_STATE.Failed]: 'Failed',
});

const REATTACHABLE_STATES: InspectionState[] = [
    INSPECTION_STATE.Detached,
    INSPECTION_STATE.Failed,
];

function hostOf(tab: InspectedTab | null): string {
    if (tab == null) {
        return 'No tab';
    }

    const host = SafeUrl.parse(tab.url)?.host ?? '';
    if (host !== '') {
        return host;
    }

    return tab.title === '' ? 'This tab' : tab.title;
}

export class HeaderBar {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        const host = buildElement('span', {
            className: 'header-host',
        });
        const statusPill = buildElement('span', {
            className: 'status-pill',
        });
        const reattachButton = FormControls.button({
            text: 'Reattach',
            variant: BUTTON_VARIANTS.Ghost,
            onClick: () => void context.timelineSync.reinspectAsync(),
        });
        const killSwitch = FormControls.toggleSwitch({
            checked: context.settingsService.current().interceptionEnabled,
            label: 'Interception',
            onChange: isChecked => void context.settingsService.updateAsync(settings => ({
                ...settings,
                interceptionEnabled: isChecked,
            })),
        });
        killSwitch.title = 'Turns every rule on or off at once.';
        const killSwitchInput = killSwitch.querySelector('input')!;

        this.root = buildElement('header', {
            className: 'header-bar',
            children: [
                buildElement('h1', {
                    className: 'brand',
                    text: 'Rewire',
                }),
                buildElement('div', {
                    className: 'header-target',
                    children: [
                        host,
                        statusPill,
                        reattachButton,
                    ],
                }),
                new ProfileSwitcher(context).root,
                new ThemeToggle(context).root,
                killSwitch,
            ],
        });

        context.store.select({
            selector: state => state.inspectedTab,
            listener: tab => {
                host.textContent = hostOf(tab);
                host.title = tab?.url ?? '';
            },
        });

        context.store.select({
            selector: state => state.inspection,
            listener: inspection => {
                statusPill.textContent = STATUS_LABELS[inspection.state];
                statusPill.dataset['state'] = String(inspection.state);
                statusPill.title = inspection.message;
                reattachButton.hidden = !REATTACHABLE_STATES.includes(inspection.state);
            },
        });

        context.store.select({
            selector: state => state.settings.interceptionEnabled,
            listener: isEnabled => {
                InputSync.setChecked(killSwitchInput, isEnabled);
                this.root.dataset['interception'] = isEnabled ? 'on' : 'off';
            },
        });
    }
}
