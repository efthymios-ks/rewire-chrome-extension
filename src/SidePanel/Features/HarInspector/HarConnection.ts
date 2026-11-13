import { Result } from "../../../Common/Results/Result";
import { TimelineSearch } from "../../../Common/Search/TimelineSearch";
import type { PanelCommand, PanelCommandOf } from "../../../Contracts/Messaging/PanelCommand";
import type { PanelCommandResults } from "../../../Contracts/Messaging/PanelCommandResults";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";
import type { IWorkerConnection } from "../../Core/WorkerConnection";

type CommandAnswer = (command: PanelCommand) => Result<unknown>;

const NotInFileText = "This call isn't in the file.";

export class HarConnection implements IWorkerConnection {
    private readonly _details: TimelineEntryDetail[];
    private readonly _answers: Partial<Record<PanelCommandType, CommandAnswer>>;

    constructor(details: TimelineEntryDetail[]) {
        this._details = details;
        this._answers = {
            [PanelCommandType.GetEntryDetail]: command => this.detailOf(command),
            [PanelCommandType.GetTimelineDetails]: () => Result.ok(this._details),
            [PanelCommandType.SearchTimeline]: command => this.search(command),
        };
    }

    async send<TCommandType extends PanelCommandType>(command: PanelCommandOf<TCommandType>): Promise<Result<PanelCommandResults[TCommandType]>> {
        const answer = this._answers[command.type];
        const result = answer === undefined ? Result.done() : answer(command);

        return result as Result<PanelCommandResults[TCommandType]>;
    }

    onEvent(): void {
        return;
    }

    onReconnect(): void {
        return;
    }

    private detailOf(command: PanelCommand): Result<TimelineEntryDetail> {
        const entryId = command.type === PanelCommandType.GetEntryDetail ? command.entryId : "";
        const detail = this._details.find(candidate => candidate.summary.id === entryId);

        return detail === undefined ? Result.fail(NotInFileText) : Result.ok(detail);
    }

    private search(command: PanelCommand): Result<unknown> {
        if (command.type !== PanelCommandType.SearchTimeline) {
            return Result.ok([]);
        }

        return TimelineSearch.search(
            this._details.map(detail => ({
                id: detail.summary.id,
                url: detail.summary.url,
                requestBody: detail.requestBody,
                responseBody: detail.responseBody,
                requestHeaders: detail.requestHeaders,
                responseHeaders: detail.responseHeaders,
            })),
            command.query
        );
    }
}
