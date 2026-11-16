import { DEFAULT_SNIPPET_PARTS } from '../../../Common/CodeGen/DefaultSnippetParts';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import type { TimelineEntrySummary } from '../../../Contracts/Timeline/TimelineEntrySummary';
import { copyWithNoticeAsync } from '../../Core/copyWithNoticeAsync';
import type { ContextMenuItem } from '../../Core/Dom/ContextMenuItem';
import { DetailSnippets } from '../Inspector/DetailSnippets';
import { SnippetMenuItems } from '../Inspector/SnippetMenuItems';
import type { PanelContext } from '../Shell/PanelContext';

export class EntryContextMenu {
    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    itemsFor(entry: TimelineEntrySummary): ContextMenuItem[] {
        return [
            {
                label: 'Open in HTTP Client',
                run: () => void this.openInClientAsync(entry),
            },
            ...SnippetMenuItems.of(snippetId => void this.copyAsync(entry, snippetId)),
        ];
    }

    private async detailOfAsync(entry: TimelineEntrySummary): Promise<TimelineEntryDetail | null> {
        const { connection, notifier, store } = this._context;
        const selected = store.getState().selectedEntryDetail;
        if (selected?.summary.id === entry.id) {
            return selected;
        }

        const detail = await connection.sendAsync<typeof PANEL_COMMAND_TYPE.GetEntryDetail>({
            type: PANEL_COMMAND_TYPE.GetEntryDetail,
            tabId: entry.tabId,
            entryId: entry.id,
        });
        if (detail.hasErrors) {
            notifier.show(detail.error);

            return null;
        }

        return detail.value;
    }

    private async openInClientAsync(entry: TimelineEntrySummary): Promise<void> {
        const detail = await this.detailOfAsync(entry);
        if (detail != null) {
            this._context.viewLauncher.openClient(DetailSnippets.snapshotOf(detail));
        }
    }

    private async copyAsync(entry: TimelineEntrySummary, snippetId: string): Promise<void> {
        const detail = await this.detailOfAsync(entry);
        if (detail == null) {
            return;
        }

        const snippet = DetailSnippets.of({
            snapshot: DetailSnippets.snapshotOf(detail),
            snippetId,
            options: DEFAULT_SNIPPET_PARTS,
        });
        await copyWithNoticeAsync({
            context: this._context,
            text: snippet,
            successMessage: SnippetMenuItems.copiedText(snippetId),
        });
    }
}
