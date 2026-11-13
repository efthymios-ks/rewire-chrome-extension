import { buildElement } from "../../Core/Dom/ElementBuilder";
import { FrameFilters } from "../../Core/FrameFilters";
import type { PageFrame } from "./PageFrames";

const FixedOptions = [
    {
        value: FrameFilters.All,
        label: "All frames",
    },
    {
        value: FrameFilters.Top,
        label: "top",
    },
];

export class FrameSelect {
    readonly root: HTMLSelectElement;

    constructor(onChange: (value: string) => void) {
        this.root = buildElement("select", {
            className: "input frame-select",
            attributes: {
                "aria-label": "Frame",
            },
        });
        this.root.addEventListener("change", () => onChange(this.root.value));
    }

    update(frames: PageFrame[], value: string): void {
        const options = [
            ...FixedOptions,
            ...frames.map(frame => ({
                value: frame.id,
                label: frame.label,
            })),
        ];
        this.root.replaceChildren(...options.map(option => buildElement("option", {
            text: option.label,
            attributes: {
                value: option.value,
            },
        })));
        this.root.value = value;
    }
}
