import { RegexCache } from '../Regex/RegexCache';
import type { CompiledRedirect } from './CompiledRedirect';
import type { RedirectSimulation } from './RedirectSimulation';
import { RedirectTemplate } from './RedirectTemplate';
import { SIMULATION_OUTCOME } from './SimulationOutcome';

// The browser engine matches regexFilter without regard to case unless isUrlFilterCaseSensitive is set.
const IGNORE_CASE_FLAG = 'i';

export const RedirectSimulator = {
    simulate(compiled: CompiledRedirect, url: string): RedirectSimulation {
        const regex = RegexCache.compile(compiled.regexFilter, IGNORE_CASE_FLAG);
        if (regex.hasErrors) {
            return {
                url,
                outcome: SIMULATION_OUTCOME.Unsupported,
                resultUrl: null,
                message: `Can't simulate in JavaScript: ${regex.error}`,
            };
        }

        const match = regex.value.exec(url);
        if (match == null) {
            return {
                url,
                outcome: SIMULATION_OUTCOME.NoMatch,
                resultUrl: null,
                message: 'No match, the request passes through.',
            };
        }

        const matchEnd = match.index + match[0].length;
        const replacement = RedirectTemplate.render(compiled.template, match);
        const resultUrl = url.slice(0, match.index) + replacement + url.slice(matchEnd);
        const missingGroups = compiled.referencedGroups.filter(groupIndex => match[groupIndex] == null);
        if (missingGroups.length > 0) {
            const names = missingGroups
                .map(groupIndex => `$${groupIndex}`)
                .join(', ');

            return {
                url,
                outcome: SIMULATION_OUTCOME.MissingGroup,
                resultUrl,
                message: `${names} missing, the redirect leaves it empty.`,
            };
        }

        return {
            url,
            outcome: SIMULATION_OUTCOME.Redirected,
            resultUrl,
            message: 'Redirects.',
        };
    },
};
