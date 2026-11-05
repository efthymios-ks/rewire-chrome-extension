import { StatusCodeLimits, StatusCodePresets } from "../../../../Contracts/Http/StatusCodePresets";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { FormControls } from "../../../Core/Dom/FormControls";

const DefaultOptionValue = "";
const CustomOptionValue = "custom";

function optionValueOf(statusCode: number | null): string {
    if (statusCode === null) {
        return DefaultOptionValue;
    }

    const isPreset = StatusCodePresets.some(preset => preset.code === statusCode);

    return isPreset ? String(statusCode) : CustomOptionValue;
}

export class StatusCodeSelect {
    readonly root: HTMLElement;

    constructor(statusCode: number | null, onChange: (statusCode: number | null) => void) {
        const customInput = FormControls.textInput({
            value: statusCode === null ? "" : String(statusCode),
            type: "number",
            className: "input status-custom",
            onInput: value => onChange(value.trim() === "" ? null : Number(value)),
        });
        customInput.min = String(StatusCodeLimits.Min);
        customInput.max = String(StatusCodeLimits.Max);

        const select = FormControls.select({
            value: optionValueOf(statusCode),
            options: [
                {
                    value: DefaultOptionValue,
                    label: "Default: server status, 200 for mocks",
                },
                ...StatusCodePresets.map(preset => ({
                    value: String(preset.code),
                    label: `${preset.code} ${preset.phrase}`,
                })),
                {
                    value: CustomOptionValue,
                    label: "Custom...",
                },
            ],
            onChange: value => {
                customInput.hidden = value !== CustomOptionValue;
                if (value === CustomOptionValue) {
                    customInput.focus();

                    return;
                }

                onChange(value === DefaultOptionValue ? null : Number(value));
            },
        });
        customInput.hidden = select.value !== CustomOptionValue;

        this.root = buildElement("div", {
            className: "status-select",
            children: [
                select,
                customInput,
            ],
        });
    }
}
