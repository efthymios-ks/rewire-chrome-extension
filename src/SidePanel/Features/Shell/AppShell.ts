import { buildElement } from '../../Core/Dom/buildElement';
import { HeaderBar } from './HeaderBar';
import { NavigationTabs } from './NavigationTabs';
import type { PanelContext } from './PanelContext';
import { RuleSyncBanner } from './RuleSyncBanner';
import { VIEW_DEFINITIONS } from './ViewDefinitions';

const MAIN_CONTENT_ID = 'main-content';

export class AppShell {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        const noticeText = buildElement('span', {
            className: 'notice-text',
        });
        const noticeAction = buildElement('button', {
            className: 'button button-ghost notice-action',
            attributes: {
                type: 'button',
            },
            listeners: {
                click: () => {
                    context.store.getState().notice?.action?.run();
                    context.notifier.dismiss();
                },
            },
        });
        const notice = buildElement('div', {
            className: 'notice',
            attributes: {
                role: 'status',
            },
            children: [
                noticeText,
                noticeAction,
            ],
        });
        const views = VIEW_DEFINITIONS.map(definition => ({
            definition,
            element: buildElement('section', {
                className: 'view',
                attributes: {
                    'aria-label': definition.label,
                },
                children: [definition.create(context)],
            }),
        }));

        this.root = buildElement('div', {
            className: 'app-shell',
            children: [
                buildElement('a', {
                    className: 'skip-link',
                    text: 'Skip to main content',
                    attributes: {
                        href: `#${MAIN_CONTENT_ID}`,
                    },
                }),
                new HeaderBar(context).root,
                new NavigationTabs(context, VIEW_DEFINITIONS).root,
                new RuleSyncBanner(context).root,
                notice,
                buildElement('main', {
                    className: 'view-host',
                    attributes: {
                        id: MAIN_CONTENT_ID,
                        tabindex: '-1',
                    },
                    children: views.map(view => view.element),
                }),
            ],
        });

        context.store.select({
            selector: state => state.activeView,
            listener: activeView => views.forEach(view => {
                view.element.hidden = view.definition.id !== activeView;
            }),
        });

        context.store.select({
            selector: state => state.notice,
            listener: current => {
                notice.hidden = current == null;
                noticeText.textContent = current?.message ?? '';
                noticeAction.hidden = current?.action == null;
                noticeAction.textContent = current?.action?.label ?? '';
            },
        });
    }
}
