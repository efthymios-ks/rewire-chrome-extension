import type { Criterion } from '../../../../Contracts/Rules/Criterion';
import { CRITERION_FIELD_IDS } from '../../../../Contracts/Rules/CriterionFieldIds';
import { CRITERION_OPERATOR_IDS } from '../../../../Contracts/Rules/CriterionOperatorIds';
import type { RuleCriteria } from '../../../../Contracts/Rules/RuleCriteria';
import type { CompiledRedirect } from '../../../Redirects/CompiledRedirect';
import { RedirectSimulator } from '../../../Redirects/RedirectSimulator';
import { RedirectTemplate } from '../../../Redirects/RedirectTemplate';
import { RegexRedirectCompiler } from '../../../Redirects/RegexRedirectCompiler';
import { SIMULATION_OUTCOME } from '../../../Redirects/SimulationOutcome';
import type { Result } from '../../../Results/Result';
import { REGEX_DESTINATION_MESSAGES } from './RegexDestinationMessages';

const NO_GROUPS: string[] = [];

const regexCompiler = new RegexRedirectCompiler();

export interface ResolveOptions {
    url: string;
    target: string;
    criteria: RuleCriteria;
}

export const RegexDestination = {
    usesGroups(target: string): boolean {
        return RedirectTemplate
            .referencedGroups(RedirectTemplate.parse(target))
            .length > 0;
    },

    groupSourceOf(criteria: RuleCriteria): Criterion | null {
        return criteria.items.find(item => item.field === CRITERION_FIELD_IDS.Url
            && item.op === CRITERION_OPERATOR_IDS.Regex
            && !item.negate) ?? null;
    },

    compile(regex: string, target: string): Result<CompiledRedirect> {
        return regexCompiler.compile({
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
        if (source == null) {
            return [REGEX_DESTINATION_MESSAGES.GroupsNeedRegex];
        }

        const compiled = RegexDestination.compile(source.value, target);

        return compiled.hasErrors ? [compiled.error] : [];
    },

    renderPlain(target: string): string {
        return RedirectTemplate.render(
            /* parts: */ RedirectTemplate.parse(target),
            /* groups: */ NO_GROUPS,
        );
    },

    resolve({ url, target, criteria }: ResolveOptions): string | null {
        if (!RegexDestination.usesGroups(target)) {
            return RegexDestination.renderPlain(target);
        }

        const source = RegexDestination.groupSourceOf(criteria);
        if (source == null) {
            return null;
        }

        const compiled = RegexDestination.compile(source.value, target);
        if (compiled.hasErrors) {
            return null;
        }

        const simulation = RedirectSimulator.simulate(compiled.value, url);

        return simulation.outcome === SIMULATION_OUTCOME.Redirected ? simulation.resultUrl : null;
    },
};
