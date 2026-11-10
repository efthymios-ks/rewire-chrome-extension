import { DefaultSnippetParts } from "../../../Common/CodeGen/RequestSnapshot";
import { RequestSnippets } from "../../../Common/CodeGen/RequestSnippets";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import type { ContextMenuItem } from "../../Core/Dom/ContextMenu";
import { DetailSnippets } from "../Inspector/DetailSnippets";
import type { PanelContext } from "../Shell/PanelContext";

export class EntryContextMenu {
    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    itemsFor(entry: TimelineEntrySummary): ContextMenuItem[] {
        return [
            {
                label: "Open in Client",
                run: () => void this.openInClient(entry),
            },
            ...RequestSnippets
                .all()
                .map(type => ({
                    label: `Copy as ${type.label}`,
                    run: () => void this.copy(entry, type.id),
                })),
        ];
    }

    private async detailOf(entry: TimelineEntrySummary): Promise<TimelineEntryDetail | null> {
        const { connection, notifier, store } = this._context;
        const selected = store.getState().selectedEntryDetail;
        if (selected?.summary.id === entry.id) {
            return selected;
        }

        const detail = await connection.send<PanelCommandType.GetEntryDetail>({
            type: PanelCommandType.GetEntryDetail,
            tabId: entry.tabId,
            entryId: entry.id,
        });
        if (detail.hasErrors) {
            notifier.show(detail.error);

            return null;
        }

        return detail.value;
    }

    private async openInClient(entry: TimelineEntrySummary): Promise<void> {
        const detail = await this.detailOf(entry);
        if (detail !== null) {
            this._context.viewLauncher.openClient(DetailSnippets.snapshotOf(detail));
        }
    }

    private async copy(entry: TimelineEntrySummary, snippetId: string): Promise<void> {
        const detail = await this.detailOf(entry);
        if (detail === null) {
            return;
        }

        const snippet = DetailSnippets.of(
            DetailSnippets.snapshotOf(detail),
            snippetId,
            DefaultSnippetParts
        );
        const copied = await this._context.clipboardClient.copy(snippet);
        this._context.notifier.show(copied.hasErrors ? copied.error : `${RequestSnippets.get(snippetId).label} snippet copied.`);
    }
}
