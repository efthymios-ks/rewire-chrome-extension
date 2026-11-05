import type { RuleSyncReport } from "../../../Contracts/RuleSync/RuleSyncReport";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import type { PanelContext } from "./PanelContext";

function failureCountText(count: number): string {
    return count === 1 ? "1 rule isn't applied" : `${count} rules aren't applied`;
}

export class RuleSyncBanner {
    readonly root: HTMLElement;

    constructor(context: PanelContext) {
        this.root = buildElement("details", {
            className: "banner banner-error",
        });

        context.store.select(
            state => state.ruleSyncReport,
            report => this.render(report)
        );
    }

    private render(report: RuleSyncReport | null): void {
        const failures = report?.failures ?? [];
        this.root.hidden = failures.length === 0;
        this.root.replaceChildren(
            buildElement("summary", {
                text: failureCountText(failures.length),
            }),
            buildElement("ul", {
                children: failures.map(failure => buildElement("li", {
                    text: `${failure.sourceName}: ${failure.message}`,
                })),
            })
        );
    }
}
