export const TEMPLATE_PART_KIND = Object.freeze({
    Literal: 1,
    GroupReference: 2,
} as const);

export type TemplatePartKind = (typeof TEMPLATE_PART_KIND)[keyof typeof TEMPLATE_PART_KIND];
