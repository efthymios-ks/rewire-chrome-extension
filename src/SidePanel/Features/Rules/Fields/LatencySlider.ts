import { LATENCY_LIMITS } from '../../../../Contracts/Settings/LatencyLimits';
import { buildElement } from '../../../Core/Dom/buildElement';
import { DurationText } from '../../../Core/Formatting/DurationText';

const NO_DELAY_TEXT = 'No delay';

function labelOf(delayInMilliseconds: number): string {
    return delayInMilliseconds === 0 ? NO_DELAY_TEXT : DurationText.of(delayInMilliseconds);
}

export class LatencySlider {
    readonly root: HTMLElement;

    constructor(delayInMilliseconds: number, onChange: (delayInMilliseconds: number) => void) {
        const label = buildElement('output', {
            className: 'latency-value',
            text: labelOf(delayInMilliseconds),
        });
        const slider = buildElement('input', {
            className: 'latency-slider',
            attributes: {
                type: 'range',
                min: String(LATENCY_LIMITS.MinDelayInMilliseconds),
                max: String(LATENCY_LIMITS.MaxDelayInMilliseconds),
                step: String(LATENCY_LIMITS.StepInMilliseconds),
                'aria-label': 'Delay',
            },
        });
        slider.value = String(delayInMilliseconds);
        slider.addEventListener(
            /* type: */ 'input',
            /* listener: */ () => {
                const value = Number(slider.value);
                label.textContent = labelOf(value);
                onChange(value);
            },
        );

        this.root = buildElement('div', {
            className: 'latency',
            children: [
                slider,
                label,
            ],
        });
    }
}
