import { LatencyLimits } from "../../../../Contracts/Settings/LatencyLimits";
import { buildElement } from "../../../Core/Dom/ElementBuilder";
import { DurationText } from "../../../Core/Formatting/DurationText";

const NoDelayText = "No delay";

function labelOf(delayInMilliseconds: number): string {
    return delayInMilliseconds === 0 ? NoDelayText : DurationText.of(delayInMilliseconds);
}

export class LatencySlider {
    readonly root: HTMLElement;

    constructor(delayInMilliseconds: number, onChange: (delayInMilliseconds: number) => void) {
        const label = buildElement("output", {
            className: "latency-value",
            text: labelOf(delayInMilliseconds),
        });
        const slider = buildElement("input", {
            className: "latency-slider",
            attributes: {
                type: "range",
                min: String(LatencyLimits.MinDelayInMilliseconds),
                max: String(LatencyLimits.MaxDelayInMilliseconds),
                step: String(LatencyLimits.StepInMilliseconds),
                "aria-label": "Delay",
            },
        });
        slider.value = String(delayInMilliseconds);
        slider.addEventListener("input", () => {
            const value = Number(slider.value);
            label.textContent = labelOf(value);
            onChange(value);
        });

        this.root = buildElement("div", {
            className: "latency",
            children: [
                slider,
                label,
            ],
        });
    }
}
