import { buildElement, type ElementChild } from "./ElementBuilder";

export const EmptyState = {
    build(message: string, actions: ElementChild[] = []): HTMLDivElement {
        return buildElement("div", {
            className: "empty-state",
            children: [
                buildElement("p", {
                    text: message,
                }),
                buildElement("div", {
                    className: "actions",
                    children: actions,
                }),
            ],
        });
    },
};
