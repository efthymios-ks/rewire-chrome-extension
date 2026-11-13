import { RequestSnippets } from "../../../Common/CodeGen/RequestSnippets";
import type { ContextMenuItem } from "../../Core/Dom/ContextMenu";

export const SnippetMenuItems = {
    of(copy: (snippetId: string) => void): ContextMenuItem[] {
        return RequestSnippets
            .all()
            .map(type => ({
                label: `Copy as ${type.label}`,
                run: () => copy(type.id),
            }));
    },

    copiedText(snippetId: string): string {
        return `${RequestSnippets.get(snippetId).label} snippet copied.`;
    },
};
