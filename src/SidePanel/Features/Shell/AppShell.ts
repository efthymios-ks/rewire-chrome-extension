import { buildElement } from "../../Core/Dom/ElementBuilder";
import { HeaderBar } from "./HeaderBar";
import { NavigationTabs } from "./NavigationTabs";
import type { PanelContext } from "./PanelContext";
import { RuleSyncBanner } from "./RuleSyncBanner";
import { ViewDefinitions } from "./ViewDefinitions";

export class AppShell {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        const noticeText = buildElement("span", {
            className: "notice-text",
        });
        const noticeAction = buildElement("button", {
            className: "button button-ghost notice-action",
            attributes: {
                type: "button",
            },
        });
        const notice = buildElement("div", {
            className: "notice",
            attributes: {
                role: "status",
            },
            children: [
                noticeText,
                noticeAction,
            ],
        });
        const views = ViewDefinitions.map(definition => ({
            definition,
            element: buildElement("div", {
                className: "view",
                children: [definition.create(context)],
            }),
        }));

        this.root = buildElement("div", {
            className: "app-shell",
            children: [
                new HeaderBar(context).root,
                new NavigationTabs(context, ViewDefinitions).root,
                new RuleSyncBanner(context).root,
                notice,
                buildElement("main", {
                    className: "view-host",
                    children: views.map(view => view.element),
                }),
            ],
        });

        context.store.select(
            state => state.activeView,
            activeView => views.forEach(view => {
                view.element.hidden = view.definition.id !== activeView;
            })
        );

        context.store.select(
            state => state.notice,
            current => {
                notice.hidden = current === null;
                noticeText.textContent = current?.message ?? "";
                noticeAction.hidden = current?.action === null || current === null;
                noticeAction.textContent = current?.action?.label ?? "";
                noticeAction.onclick = () => {
                    current?.action?.run();
                    context.notifier.dismiss();
                };
            }
        );
    }
}
