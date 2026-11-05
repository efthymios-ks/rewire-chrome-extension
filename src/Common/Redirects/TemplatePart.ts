import type { TemplatePartKind } from "./TemplatePartKind";

export interface LiteralTemplatePart {
    kind: TemplatePartKind.Literal;
    text: string;
}

export interface GroupReferenceTemplatePart {
    kind: TemplatePartKind.GroupReference;
    groupIndex: number;
}

export type TemplatePart = LiteralTemplatePart | GroupReferenceTemplatePart;
