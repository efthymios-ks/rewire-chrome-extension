import { type RedirectDefinition, RedirectKind } from "./RedirectDefinition";
import { RegexStructureAnalyzer } from "../Regex/RegexStructureAnalyzer";
import type { RegexStructure } from "../Regex/RegexStructure";
import { StrictGroupRewriter } from "../Regex/StrictGroupRewriter";
import { Result } from "../Results/Result";
import type { CompiledRedirect } from "./CompiledRedirect";
import type { IRedirectKindCompiler } from "./IRedirectKindCompiler";
import { RedirectTemplate } from "./RedirectTemplate";

const WholeMatchGroupIndex = 0;

interface FilterArguments {
    pattern: string;
    structure: RegexStructure;
    referencedGroups: number[];
    strictParameters: boolean;
}

function filterFor(args: FilterArguments): Result<string> {
    if (!args.strictParameters) {
        return Result.ok(args.pattern);
    }

    const captureGroups = args.referencedGroups.filter(groupIndex => groupIndex > WholeMatchGroupIndex);

    return StrictGroupRewriter.rewrite(
        args.pattern,
        args.structure,
        captureGroups
    );
}

export class RegexRedirectCompiler implements IRedirectKindCompiler {
    readonly kind = RedirectKind.Regex;

    compile(rule: RedirectDefinition): Result<CompiledRedirect> {
        const pattern = rule.source.trim();
        if (pattern.length === 0) {
            return Result.fail("Regex is required.");
        }

        const templateText = rule.target.trim();
        if (templateText.length === 0) {
            return Result.fail("Redirect template is required.");
        }

        const structure = RegexStructureAnalyzer.analyze(pattern);
        if (structure.hasErrors) {
            return structure;
        }

        const template = RedirectTemplate.parse(templateText);
        const referencedGroups = RedirectTemplate.referencedGroups(template);
        const unknownGroups = referencedGroups.filter(groupIndex => groupIndex > structure.value.captureGroupCount);
        if (unknownGroups.length > 0) {
            const names = unknownGroups
                .map(groupIndex => `$${groupIndex}`)
                .join(", ");

            return Result.fail(`Template uses ${names}, but the regex has ${structure.value.captureGroupCount} capture group(s).`);
        }

        const regexFilter = filterFor({
            pattern,
            structure: structure.value,
            referencedGroups,
            strictParameters: rule.strictParameters,
        });
        if (regexFilter.hasErrors) {
            return regexFilter;
        }

        return Result.ok({
            regexFilter: regexFilter.value,
            regexSubstitution: RedirectTemplate.toSubstitution(template),
            template,
            referencedGroups,
        });
    }
}
