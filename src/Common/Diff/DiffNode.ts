import type { DiffKind } from "./DiffKind";
import type { JsonValueType } from "./JsonValueType";

export interface DiffNode {
    key: string | null;
    kind: DiffKind;
    valueType: JsonValueType;
    before: unknown;
    after: unknown;
    children: DiffNode[];
}
