import type { TesterInput, TesterReport } from "../../../../Common/Rules/Engine/RuleTester";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { PanelLimits } from "../../../Core/PanelLimits";
import { TesterForm } from "./TesterForm";
import { TesterReportView } from "./TesterReportView";

export type TesterRunner = (input: TesterInput) => TesterReport;

export class RuleTesterPanel {
    readonly root: HTMLElement;

    private readonly _form: TesterForm;
    private readonly _report: HTMLElement;
    private readonly _runner: TesterRunner;
    private _timer: ReturnType<typeof setTimeout> | null = null;

    constructor(sampleUrl: string, runner: TesterRunner) {
        this._runner = runner;
        this._form = new TesterForm(sampleUrl, () => this.refresh());
        this._report = buildElement("div", {
            className: "tester-output",
        });
        this.root = buildElement("div", {
            className: "rule-tester",
            children: [
                this._form.root,
                this._report,
            ],
        });
        this.run();
    }

    refresh(): void {
        if (this._timer !== null) {
            clearTimeout(this._timer);
        }

        this._timer = setTimeout(
            () => this.run(),
            PanelLimits.TesterDebounceInMilliseconds
        );
    }

    private run(): void {
        this._timer = null;
        this._report.replaceChildren(TesterReportView.build(this._runner(this._form.input())));
    }
}
