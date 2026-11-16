import type { RedirectDefinition } from './RedirectDefinition';
import { RegexStructureAnalyzer } from '../Regex/RegexStructureAnalyzer';
import type { RegexStructure } from '../Regex/RegexStructure';
import { StrictGroupRewriter } from '../Regex/StrictGroupRewriter';
import { Result } from '../Results/Result';
import type { CompiledRedirect } from './CompiledRedirect';
import { RedirectTemplate } from './RedirectTemplate';

const WHOLE_MATCH_GROUP_INDEX = 0;

interface FilterForOptions {
    pattern: string;
    structure: RegexStructure;
    referencedGroups: number[];
    strictParameters: boolean;
}

function filterFor(args: FilterForOptions): Result<string> {
    if (!args.strictParameters) {
        return Result.ok(args.pattern);
    }

    const captureGroups = args.referencedGroups.filter(groupIndex => groupIndex > WHOLE_MATCH_GROUP_INDEX);

    return StrictGroupRewriter.rewrite({
        pattern: args.pattern,
        structure: args.structure,
        groupIndexes: captureGroups,
    });
}

export class RegexRedirectCompiler {
    compile(rule: RedirectDefinition): Result<CompiledRedirect> {
        const pattern = rule.source.trim();
        if (pattern.length === 0) {
            return Result.fail('Regex is required.');
        }

        const templateText = rule.target.trim();
        if (templateText.length === 0) {
            return Result.fail('Redirect template is required.');
        }

        const structure = RegexStructureAnalyzer.analyze(pattern);
        if (structure.hasErrors) {
            return structure;
        }

        const template = RedirectTemplate.parse(templateText);
        const referencedGroups = RedirectTemplate.referencedGroups(template);
        const { captureGroupCount } = structure.value;
        const unknownGroups = referencedGroups.filter(groupIndex => groupIndex > captureGroupCount);
        if (unknownGroups.length > 0) {
            const names = unknownGroups
                .map(groupIndex => `$${groupIndex}`)
                .join(', ');

            return Result.fail(`Template uses ${names}, but the regex has ${captureGroupCount} capture group(s).`);
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
