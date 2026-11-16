import { STATUS_CODE_LIMITS } from '../../../../Contracts/Http/StatusCodeLimits';
import { STATUS_CODE_PRESETS } from '../../../../Contracts/Http/StatusCodePreset';
import { buildElement } from '../../../Core/Dom/buildElement';
import { FormControls } from '../../../Core/Dom/FormControls';

const DEFAULT_OPTION_VALUE = '';
const CUSTOM_OPTION_VALUE = 'custom';

function optionValueOf(statusCode: number | null): string {
    if (statusCode == null) {
        return DEFAULT_OPTION_VALUE;
    }

    const isPreset = STATUS_CODE_PRESETS.some(preset => preset.code === statusCode);

    return isPreset ? String(statusCode) : CUSTOM_OPTION_VALUE;
}

export class StatusCodeSelect {
    readonly root: HTMLElement;

    constructor(statusCode: number | null, onChange: (statusCode: number | null) => void) {
        const customInput = FormControls.textInput({
            value: statusCode == null ? '' : String(statusCode),
            type: 'number',
            className: 'input status-custom',
            onInput: value => onChange(value.trim() === '' ? null : Number(value)),
        });
        customInput.min = String(STATUS_CODE_LIMITS.Min);
        customInput.max = String(STATUS_CODE_LIMITS.Max);

        const select = FormControls.select({
            value: optionValueOf(statusCode),
            options: [
                {
                    value: DEFAULT_OPTION_VALUE,
                    label: 'Default: server status, 200 for mocks',
                },
                ...STATUS_CODE_PRESETS.map(preset => ({
                    value: String(preset.code),
                    label: `${preset.code} ${preset.phrase}`,
                })),
                {
                    value: CUSTOM_OPTION_VALUE,
                    label: 'Custom...',
                },
            ],
            onChange: value => {
                customInput.hidden = value !== CUSTOM_OPTION_VALUE;
                if (value === CUSTOM_OPTION_VALUE) {
                    customInput.focus();

                    return;
                }

                onChange(value === DEFAULT_OPTION_VALUE ? null : Number(value));
            },
        });
        customInput.hidden = select.value !== CUSTOM_OPTION_VALUE;

        this.root = buildElement('div', {
            className: 'status-select',
            children: [
                select,
                customInput,
            ],
        });
    }
}
