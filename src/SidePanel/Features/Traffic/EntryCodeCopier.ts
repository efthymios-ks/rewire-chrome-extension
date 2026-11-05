import { DefaultSnippetParts } from "../../../Common/CodeGen/RequestSnapshot";
import { SnippetGenerators } from "../../../Common/CodeGen/SnippetGenerators";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { TimelineEntrySummary } from "../../../Contracts/Timeline/TimelineEntrySummary";
import type { ContextMenuItem } from "../../Core/Dom/ContextMenu";
import { DetailSnippets } from "../Inspector/DetailSnippets";
import type { PanelContext } from "../Shell/PanelContext";

export class EntryCodeCopier {
    private readonly _context: PanelContext;

    constructor(context: PanelContext) {
        this._context = context;
    }

    menuFor(entry: TimelineEntrySummary): ContextMenuItem[] {
        return SnippetGenerators
            .all()
            .map(generator => ({
                label: `Copy as ${generator.label}`,
                run: () => void this.copy(entry, generator.id),
            }));
    }

    private async copy(entry: TimelineEntrySummary, generatorId: string): Promise<void> {
        const { connection, clipboardClient, notifier } = this._context;
        const detail = await connection.send<PanelCommandType.GetEntryDetail>({
            type: PanelCommandType.GetEntryDetail,
            tabId: entry.tabId,
            entryId: entry.id,
        });
        if (detail.hasErrors) {
            notifier.show(detail.error);

            return;
        }

        const snippet = DetailSnippets.of(
            DetailSnippets.snapshotOf(detail.value, false),
            generatorId,
            DefaultSnippetParts
        );
        const copied = await clipboardClient.copy(snippet);
        notifier.show(copied.hasErrors ? copied.error : `${SnippetGenerators.get(generatorId).label} snippet copied.`);
    }
}
