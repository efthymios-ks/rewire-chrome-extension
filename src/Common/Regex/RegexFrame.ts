import type { RegexQuantifier } from "./RegexQuantifier";

export interface RegexFrame {
    id: number;
    parentId: number | null;
    captureIndex: number | null;
    quantifier: RegexQuantifier | null;
    hasAlternation: boolean;
}
