import { type Criterion, CriterionFieldIds, CriterionOperatorIds, type RuleCriteria } from "../../../../Contracts/Rules/Criterion";
import type { CompiledRedirect } from "../../../Redirects/CompiledRedirect";
import { RedirectKind } from "../../../Redirects/RedirectDefinition";
import { RedirectSimulator } from "../../../Redirects/RedirectSimulator";
import { RedirectTemplate } from "../../../Redirects/RedirectTemplate";
import { RegexRedirectCompiler } from "../../../Redirects/RegexRedirectCompiler";
import { SimulationOutcome } from "../../../Redirects/SimulationOutcome";
import type { Result } from "../../../Results/Result";

export const RegexDestinationMessages = {
    GroupsNeedRegex: "Add a URL condition that matches a regex to use $1 to $9.",
} as const;

const NoGroups: string[] = [];

const regexCompiler = new RegexRedirectCompiler();

export const RegexDestination = {
    usesGroups(target: string): boolean {
        return RedirectTemplate
            .referencedGroups(RedirectTemplate.parse(target))
            .length > 0;
    },

    groupSourceOf(criteria: RuleCriteria): Criterion | null {
        return criteria.items.find(item => item.field === CriterionFieldIds.Url
            && item.op === CriterionOperatorIds.Regex
            && !item.negate) ?? null;
    },

    compile(regex: string, target: string): Result<CompiledRedirect> {
        return regexCompiler.compile({
            kind: RedirectKind.Regex,
            source: `^.*?(?:${regex}).*$`,
            target,
            strictParameters: true,
        });
    },

    groupErrorsOf(target: string, criteria: RuleCriteria): string[] {
        if (!RegexDestination.usesGroups(target)) {
            return [];
        }

        const source = RegexDestination.groupSourceOf(criteria);
        if (source === null) {
            return [RegexDestinationMessages.GroupsNeedRegex];
        }

        const compiled = RegexDestination.compile(source.value, target);

        return compiled.hasErrors ? [compiled.error] : [];
    },

    renderPlain(target: string): string {
        return RedirectTemplate.render(RedirectTemplate.parse(target), NoGroups);
    },

    resolve(
        url: string,
        target: string,
        criteria: RuleCriteria
    ): string | null {
        if (!RegexDestination.usesGroups(target)) {
            return RegexDestination.renderPlain(target);
        }

        const source = RegexDestination.groupSourceOf(criteria);
        if (source === null) {
            return null;
        }

        const compiled = RegexDestination.compile(source.value, target);
        if (compiled.hasErrors) {
            return null;
        }

        const simulation = RedirectSimulator.simulate(compiled.value, url);

        return simulation.outcome === SimulationOutcome.Redirected ? simulation.resultUrl : null;
    },
};
