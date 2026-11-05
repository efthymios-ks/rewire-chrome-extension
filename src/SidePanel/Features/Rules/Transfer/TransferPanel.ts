import { ImportMode, type RuleBundle } from "../../../../Common/Rules/Transfer/RuleBundle";
import { RuleTransfer } from "../../../../Common/Rules/Transfer/RuleTransfer";
import { JsonText } from "../../../../Common/Json/JsonText";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { ButtonVariants, FormControls } from "../../../Core/Dom/FormControls";
import type { IFileClient } from "../../../Core/FileClient";
import type { PanelContext } from "../../Shell/PanelContext";

const JsonMimeType = "application/json";
const JsonAccept = ".json,application/json";
const ExportFileName = "rewire-rules.json";

export class TransferPanel {
    readonly root: HTMLElement;

    private readonly _context: PanelContext;
    private readonly _fileClient: IFileClient;
    private readonly _preview: HTMLElement;
    private _includeSecrets = false;
    private _mode = ImportMode.Merge;
    private _pending: RuleBundle | null = null;

    constructor(context: PanelContext, fileClient: IFileClient) {
        this._context = context;
        this._fileClient = fileClient;
        this._preview = buildElement("div", {
            className: "import-preview",
        });

        this.root = buildElement("div", {
            className: "transfer-panel",
            children: [
                buildElement("section", {
                    className: "editor-section",
                    children: [
                        buildElement("h3", {
                            className: "editor-section-title",
                            text: "Export",
                        }),
                        FormControls.checkbox({
                            checked: false,
                            label: "Include cookie values and auth headers",
                            onChange: checked => {
                                this._includeSecrets = checked;
                            },
                        }),
                        FormControls.button({
                            text: "Copy JSON",
                            onClick: () => void this.copyRules(),
                        }),
                        FormControls.button({
                            text: "Download JSON",
                            variant: ButtonVariants.Primary,
                            onClick: () => this.exportRules(),
                        }),
                    ],
                }),
                buildElement("section", {
                    className: "editor-section",
                    children: [
                        buildElement("h3", {
                            className: "editor-section-title",
                            text: "Import",
                        }),
                        FormControls.select({
                            value: String(ImportMode.Merge),
                            options: [
                                {
                                    value: String(ImportMode.Merge),
                                    label: "Merge: add new, replace same ids",
                                },
                                {
                                    value: String(ImportMode.Replace),
                                    label: "Replace every rule",
                                },
                            ],
                            onChange: value => {
                                this._mode = Number(value) as ImportMode;
                            },
                        }),
                        FormControls.button({
                            text: "Choose file",
                            onClick: () => void this.pickFile(),
                        }),
                        this._preview,
                    ],
                }),
            ],
        });
    }

    private exportRules(): void {
        this._fileClient.download(
            this.bundleJson(),
            ExportFileName,
            JsonMimeType
        );
    }

    private async copyRules(): Promise<void> {
        const copied = await this._context.clipboardClient.copy(this.bundleJson());
        this._context.notifier.show(copied.hasErrors ? copied.error : "Rules JSON copied.");
    }

    private bundleJson(): string {
        return JsonText.stringify(RuleTransfer.export(this._context.settingsService.current(), this._includeSecrets));
    }

    private async pickFile(): Promise<void> {
        const picked = await this._fileClient.pickText(JsonAccept);
        if (picked.hasErrors) {
            this.showError(picked.error);

            return;
        }

        if (picked.value === null) {
            return;
        }

        const parsed = RuleTransfer.parse(picked.value);
        if (parsed.hasErrors) {
            this.showError(parsed.error);

            return;
        }

        this._pending = parsed.value;
        this._preview.replaceChildren(
            buildElement("p", {
                text: `${parsed.value.rules.length} rules.`,
            }),
            FormControls.button({
                text: "Import",
                variant: ButtonVariants.Primary,
                onClick: () => void this.importPending(),
            })
        );
    }

    private async importPending(): Promise<void> {
        if (this._pending === null) {
            return;
        }

        const imported = await this._context.settingsService.importBundle(this._pending, this._mode);
        if (imported.hasErrors) {
            return;
        }

        this._context.notifier.show(`Imported ${this._pending.rules.length} rules.`);
        this._pending = null;
        this._preview.replaceChildren();
    }

    private showError(message: string): void {
        this._preview.replaceChildren(buildElement("p", {
            className: "form-error",
            text: message,
        }));
    }
}
