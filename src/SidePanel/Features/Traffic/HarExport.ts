import { HarBuilder } from '../../../Common/Har/HarBuilder';
import { JsonText } from '../../../Common/Json/JsonText';
import { Result } from '../../../Common/Results/Result';
import { SafeUrl } from '../../../Common/Urls/SafeUrl';
import { PANEL_COMMAND_TYPE } from '../../../Contracts/Messaging/PanelCommandType';
import { copyWithNoticeAsync } from '../../Core/copyWithNoticeAsync';
import type { FileClient } from '../../Core/FileClient';
import type { PanelContext } from '../Shell/PanelContext';

const HAR_MIME_TYPE = 'application/json';
const HAR_EXTENSION = '.har';
const FALLBACK_HOST = 'timeline';
const FILE_NAME_UNSAFE_PATTERN = /[^\w.-]+/g;
const FILE_NAME_SEPARATOR = '-';
const STAMP_LENGTH = 19;

export interface HarExportDependencies {
    context: PanelContext;
    fileClient: FileClient;
    versionOf: () => string;
    now: () => Date;
}

export class HarExport {
    private readonly _dependencies: HarExportDependencies;

    constructor(dependencies: HarExportDependencies) {
        this._dependencies = dependencies;
    }

    async downloadAsync(shouldIncludeSecrets: boolean): Promise<void> {
        const { fileClient, context } = this._dependencies;
        const har = await this.harTextAsync(shouldIncludeSecrets);
        if (har.hasErrors) {
            context.notifier.show(har.error);

            return;
        }

        fileClient.download({
            text: har.value,
            fileName: this.fileName(),
            mimeType: HAR_MIME_TYPE,
        });
    }

    async copyAsync(shouldIncludeSecrets: boolean): Promise<void> {
        const { context } = this._dependencies;
        const har = await this.harTextAsync(shouldIncludeSecrets);
        if (har.hasErrors) {
            context.notifier.show(har.error);

            return;
        }

        await copyWithNoticeAsync({
            context,
            text: har.value,
            successMessage: 'HAR copied.',
        });
    }

    private async harTextAsync(shouldIncludeSecrets: boolean): Promise<Result<string>> {
        const { context, versionOf } = this._dependencies;
        const tab = context.store.getState().inspectedTab;
        if (tab == null) {
            return Result.fail('No tab is inspected.');
        }

        const details = await context.connection.sendAsync<typeof PANEL_COMMAND_TYPE.GetTimelineDetails>({
            type: PANEL_COMMAND_TYPE.GetTimelineDetails,
            tabId: tab.tabId,
        });
        if (details.hasErrors) {
            return Result.fail(details.error);
        }

        if (details.value.length === 0) {
            return Result.fail('The timeline is empty.');
        }

        return Result.ok(JsonText.stringify(HarBuilder.build(
            /* details: */ details.value,
            /* options: */ {
                creatorVersion: versionOf(),
                shouldIncludeSecrets,
            },
        )));
    }

    private fileName(): string {
        const { context, now } = this._dependencies;
        const url = context.store.getState().inspectedTab?.url ?? '';
        const parsedHost = SafeUrl.parse(url)?.host ?? '';
        const host = parsedHost === '' ? FALLBACK_HOST : parsedHost;
        const stamp = now()
            .toISOString()
            .slice(0, STAMP_LENGTH);
        const baseName = `${host}${FILE_NAME_SEPARATOR}${stamp}`;

        return baseName.replace(FILE_NAME_UNSAFE_PATTERN, FILE_NAME_SEPARATOR) + HAR_EXTENSION;
    }
}
