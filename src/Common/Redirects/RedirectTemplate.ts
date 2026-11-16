import type { TemplatePart } from './TemplatePart';
import { TEMPLATE_PART_KIND } from './TemplatePartKind';

const REFERENCE_MARKER = '$';
const DIGIT_PATTERN = /^\d$/;
const SUBSTITUTION_ESCAPE = '\\';

function appendLiteral(parts: TemplatePart[], text: string): void {
    if (text.length === 0) {
        return;
    }

    parts.push({
        kind: TEMPLATE_PART_KIND.Literal,
        text,
    });
}

export const RedirectTemplate = {
    parse(template: string): TemplatePart[] {
        const parts: TemplatePart[] = [];
        let literal = '';
        let index = 0;
        while (index < template.length) {
            const character = template.charAt(index);
            const next = template.charAt(index + 1);
            if (character === REFERENCE_MARKER && DIGIT_PATTERN.test(next)) {
                appendLiteral(parts, literal);
                literal = '';
                parts.push({
                    kind: TEMPLATE_PART_KIND.GroupReference,
                    groupIndex: Number(next),
                });
                index += 2;
                continue;
            }

            if (character === REFERENCE_MARKER && next === REFERENCE_MARKER) {
                literal += REFERENCE_MARKER;
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
            .filter(part => part.kind === TEMPLATE_PART_KIND.GroupReference)
            .map(part => part.groupIndex);

        return [...new Set(groupIndexes)].sort((left, right) => left - right);
    },

    toSubstitution(parts: TemplatePart[]): string {
        return parts
            .map(part => part.kind === TEMPLATE_PART_KIND.Literal
                ? part.text.replaceAll(SUBSTITUTION_ESCAPE, `${SUBSTITUTION_ESCAPE}${SUBSTITUTION_ESCAPE}`)
                : `${SUBSTITUTION_ESCAPE}${part.groupIndex}`,
            )
            .join('');
    },

    render(parts: TemplatePart[], groups: ArrayLike<string | undefined>): string {
        return parts
            .map(part => part.kind === TEMPLATE_PART_KIND.Literal
                ? part.text
                : groups[part.groupIndex] ?? '',
            )
            .join('');
    },
};
