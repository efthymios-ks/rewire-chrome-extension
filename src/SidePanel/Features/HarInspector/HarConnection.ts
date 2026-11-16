import { Result } from '../../../Common/Results/Result';
import { TimelineSearch } from '../../../Common/Search/TimelineSearch';
import type { PanelCommand, PanelCommandOf } from '../../../Contracts/Messaging/PanelCommand';
import type { PanelCommandResults } from '../../../Contracts/Messaging/PanelCommandResults';
import { PANEL_COMMAND_TYPE, type PanelCommandType } from '../../../Contracts/Messaging/PanelCommandType';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';
import type { WorkerConnection } from '../../Core/WorkerConnection';

type CommandAnswer = (command: PanelCommand) => Result<unknown>;

const NOT_IN_FILE_TEXT = "This call isn't in the file.";

export class HarConnection implements WorkerConnection {
    private readonly _details: TimelineEntryDetail[];
    private readonly _answers: Partial<Record<PanelCommandType, CommandAnswer>>;

    constructor(details: TimelineEntryDetail[]) {
        this._details = details;
        this._answers = {
            [PANEL_COMMAND_TYPE.GetEntryDetail]: command => this.detailOf(command),
            [PANEL_COMMAND_TYPE.GetTimelineDetails]: () => Result.ok(this._details),
            [PANEL_COMMAND_TYPE.SearchTimeline]: command => this.search(command),
        };
    }

    async sendAsync<TCommandType extends PanelCommandType>(
        command: PanelCommandOf<TCommandType>,
    ): Promise<Result<PanelCommandResults[TCommandType]>> {
        const answer = this._answers[command.type];
        const result = answer == null ? Result.done() : answer(command);

        return result as Result<PanelCommandResults[TCommandType]>;
    }

    onEvent(): void {
        return;
    }

    onReconnect(): void {
        return;
    }

    private detailOf(command: PanelCommand): Result<TimelineEntryDetail> {
        const entryId = command.type === PANEL_COMMAND_TYPE.GetEntryDetail ? command.entryId : '';
        const detail = this._details.find(candidate => candidate.summary.id === entryId);

        return detail == null ? Result.fail(NOT_IN_FILE_TEXT) : Result.ok(detail);
    }

    private search(command: PanelCommand): Result<unknown> {
        if (command.type !== PANEL_COMMAND_TYPE.SearchTimeline) {
            return Result.ok([]);
        }

        return TimelineSearch.search(
            /* entries: */ this._details.map(detail => ({
                id: detail.summary.id,
                url: detail.summary.url,
                requestBody: detail.requestBody,
                responseBody: detail.responseBody,
                requestHeaders: detail.requestHeaders,
                responseHeaders: detail.responseHeaders,
            })),
            /* query: */ command.query,
        );
    }
}
