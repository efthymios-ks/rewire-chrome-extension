import type { TemplatePart } from "./TemplatePart";
import { TemplatePartKind } from "./TemplatePartKind";

const ReferenceMarker = "$";
const DigitPattern = /^\d$/;
const SubstitutionEscape = "\\";

function appendLiteral(parts: TemplatePart[], text: string): void {
    if (text.length === 0) {
        return;
    }

    parts.push({
        kind: TemplatePartKind.Literal,
        text,
    });
}

export const RedirectTemplate = {
    parse(template: string): TemplatePart[] {
        const parts: TemplatePart[] = [];
        let literal = "";
        let index = 0;
        while (index < template.length) {
            const character = template.charAt(index);
            const next = template.charAt(index + 1);
            if (character === ReferenceMarker && DigitPattern.test(next)) {
                appendLiteral(parts, literal);
                literal = "";
                parts.push({
                    kind: TemplatePartKind.GroupReference,
                    groupIndex: Number(next),
                });
                index += 2;
                continue;
            }

            if (character === ReferenceMarker && next === ReferenceMarker) {
                literal += ReferenceMarker;
                index += 2;
                continue;
            }

            literal += character;
            index += 1;
        }

        appendLiteral(parts, literal);

        return parts;
    },

    referencedGroups(parts: TemplatePart[]): number[] {
        const groupIndexes = parts
            .filter(part => part.kind === TemplatePartKind.GroupReference)
            .map(part => part.groupIndex);

        return [...new Set(groupIndexes)].sort((left, right) => left - right);
    },

    toSubstitution(parts: TemplatePart[]): string {
        return parts
            .map(part => part.kind === TemplatePartKind.Literal
                ? part.text.replaceAll(SubstitutionEscape, `${SubstitutionEscape}${SubstitutionEscape}`)
                : `${SubstitutionEscape}${part.groupIndex}`
            )
            .join("");
    },

    render(parts: TemplatePart[], groups: ArrayLike<string | undefined>): string {
        return parts
            .map(part => part.kind === TemplatePartKind.Literal
                ? part.text
                : groups[part.groupIndex] ?? ""
            )
            .join("");
    },
};
