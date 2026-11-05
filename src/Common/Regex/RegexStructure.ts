import type { RegexFrame } from "./RegexFrame";

export interface RegexStructure {
    frames: RegexFrame[];
    captureGroupCount: number;
}
