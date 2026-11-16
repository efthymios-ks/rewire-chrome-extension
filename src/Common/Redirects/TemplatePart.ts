import type { TEMPLATE_PART_KIND } from './TemplatePartKind';

export interface LiteralTemplatePart {
    kind: typeof TEMPLATE_PART_KIND.Literal;
    text: string;
}

export interface GroupReferenceTemplatePart {
    kind: typeof TEMPLATE_PART_KIND.GroupReference;
    groupIndex: number;
}

export type TemplatePart = LiteralTemplatePart | GroupReferenceTemplatePart;
