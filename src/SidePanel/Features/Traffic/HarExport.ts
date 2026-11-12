import { HarBuilder } from "../../../Common/Har/HarBuilder";
import { JsonText } from "../../../Common/Json/JsonText";
import { Result } from "../../../Common/Results/Result";
import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import { PanelCommandType } from "../../../Contracts/Messaging/PanelCommandType";
import type { IFileClient } from "../../Core/FileClient";
import type { PanelContext } from "../Shell/PanelContext";

const HarMimeType = "application/json";
const HarExtension = ".har";
const FallbackHost = "timeline";
const FileNameUnsafePattern = /[^\w.-]+/g;
const FileNameSeparator = "-";
const StampLength = 19;

export interface HarExportDependencies {
    context: PanelContext;
    fileClient: IFileClient;
    versionOf: () => string;
    now: () => Date;
}

export class HarExport {
    private readonly _dependencies: HarExportDependencies;

    constructor(dependencies: HarExportDependencies) {
        this._dependencies = dependencies;
    }

    async download(includeSecrets: boolean): Promise<void> {
        const { fileClient, context } = this._dependencies;
        const har = await this.harText(includeSecrets);
        if (har.hasErrors) {
            context.notifier.show(har.error);

            return;
        }

        fileClient.download(
            har.value,
            this.fileName(),
            HarMimeType
        );
    }

    async copy(includeSecrets: boolean): Promise<void> {
        const { context } = this._dependencies;
        const har = await this.harText(includeSecrets);
        if (har.hasErrors) {
            context.notifier.show(har.error);

            return;
        }

        const copied = await context.clipboardClient.copy(har.value);
        context.notifier.show(copied.hasErrors ? copied.error : "HAR copied.");
    }

    private async harText(includeSecrets: boolean): Promise<Result<string>> {
        const { context, versionOf } = this._dependencies;
        const tab = context.store.getState().inspectedTab;
        if (tab === null) {
            return Result.fail("No tab is inspected.");
        }

        const details = await context.connection.send<PanelCommandType.GetTimelineDetails>({
            type: PanelCommandType.GetTimelineDetails,
            tabId: tab.tabId,
        });
        if (details.hasErrors) {
            return Result.fail(details.error);
        }

        if (details.value.length === 0) {
            return Result.fail("The timeline is empty.");
        }

        return Result.ok(JsonText.stringify(HarBuilder.build(
            details.value,
            {
                creatorVersion: versionOf(),
                includeSecrets,
            }
        )));
    }

    private fileName(): string {
        const { context, now } = this._dependencies;
        const url = context.store.getState().inspectedTab?.url ?? "";
        const host = SafeUrl.parse(url)?.host || FallbackHost;
        const stamp = now()
            .toISOString()
            .slice(0, StampLength);

        return `${host}${FileNameSeparator}${stamp}`.replace(FileNameUnsafePattern, FileNameSeparator) + HarExtension;
    }
}
