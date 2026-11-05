import { Result } from "../Results/Result";
import type { RegexFrame } from "./RegexFrame";
import type { RegexQuantifier } from "./RegexQuantifier";
import type { RegexStructure } from "./RegexStructure";

const NeverMatchingQuantifierPattern = /^\{0(?:,0)?\}\??$/;

interface QuantifierRewrite {
    pattern: RegExp;
    replace(match: RegExpExecArray): string;
}

const QuantifierRewrites: QuantifierRewrite[] = [
    {
        pattern: /^\?\??$/,
        replace: () => "",
    },
    {
        pattern: /^\*(\??)$/,
        replace: match => `+${match[1] ?? ""}`,
    },
    {
        pattern: /^\{0,(\d*)\}(\??)$/,
        replace: match => `{1,${match[1] ?? ""}}${match[2] ?? ""}`,
    },
];

function collectOptionalQuantifiers(structure: RegexStructure, groupIndex: number): Result<RegexQuantifier[]> {
    const group = structure.frames.find(frame => frame.captureIndex === groupIndex);
    if (group === undefined) {
        return Result.fail(`The regex has no group $${groupIndex}.`);
    }

    const framesById = new Map(structure.frames.map(frame => [
        frame.id,
        frame,
    ]));
    const quantifiers: RegexQuantifier[] = [];
    let frame: RegexFrame | undefined = group;
    while (frame !== undefined) {
        if (frame !== group && frame.hasAlternation) {
            return Result.fail(`$${groupIndex} sits inside an alternation (|), strict mode can't require it.`);
        }

        if (frame.quantifier?.isOptional) {
            quantifiers.push(frame.quantifier);
        }

        frame = frame.parentId === null ? undefined : framesById.get(frame.parentId);
    }

    return Result.ok(quantifiers);
}

function mandatoryFormOf(quantifier: RegexQuantifier): Result<string> {
    if (NeverMatchingQuantifierPattern.test(quantifier.text)) {
        return Result.fail(`Quantifier "${quantifier.text}" never matches, strict mode can't require it.`);
    }

    for (const rewrite of QuantifierRewrites) {
        const match = rewrite.pattern.exec(quantifier.text);
        if (match !== null) {
            return Result.ok(rewrite.replace(match));
        }
    }

    return Result.fail(`Quantifier "${quantifier.text}" can't be made mandatory.`);
}

export const StrictGroupRewriter = {
    rewrite(
        pattern: string,
        structure: RegexStructure,
        groupIndexes: number[]
    ): Result<string> {
        const quantifiersByStart = new Map<number, RegexQuantifier>();
        for (const groupIndex of groupIndexes) {
            const collected = collectOptionalQuantifiers(structure, groupIndex);
            if (collected.hasErrors) {
                return collected;
            }

            collected.value.forEach(quantifier => quantifiersByStart.set(quantifier.start, quantifier));
        }

        const quantifiersFromEnd = [...quantifiersByStart.values()].sort((left, right) => right.start - left.start);
        let rewritten = pattern;
        for (const quantifier of quantifiersFromEnd) {
            const replacement = mandatoryFormOf(quantifier);
            if (replacement.hasErrors) {
                return replacement;
            }

            rewritten = rewritten.slice(0, quantifier.start) + replacement.value + rewritten.slice(quantifier.end);
        }

        return Result.ok(rewritten);
    },
};
