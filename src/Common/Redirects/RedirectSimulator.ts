import { ErrorText } from "../Errors/ErrorText";
import { Result } from "../Results/Result";
import type { CompiledRedirect } from "./CompiledRedirect";
import type { RedirectSimulation } from "./RedirectSimulation";
import { RedirectTemplate } from "./RedirectTemplate";
import { SimulationOutcome } from "./SimulationOutcome";

const Re2NamedGroupPattern = /\(\?P</g;
const JavaScriptNamedGroup = "(?<";

function toJavaScriptRegExp(regexFilter: string): Result<RegExp> {
    try {
        return Result.ok(new RegExp(regexFilter.replace(Re2NamedGroupPattern, JavaScriptNamedGroup)));
    } catch (error) {
        return Result.fail(ErrorText.of(error));
    }
}

export const RedirectSimulator = {
    simulate(compiled: CompiledRedirect, url: string): RedirectSimulation {
        const regex = toJavaScriptRegExp(compiled.regexFilter);
        if (regex.hasErrors) {
            return {
                url,
                outcome: SimulationOutcome.Unsupported,
                resultUrl: null,
                message: `Can't simulate in JavaScript: ${regex.error}`,
            };
        }

        const match = regex.value.exec(url);
        if (match === null) {
            return {
                url,
                outcome: SimulationOutcome.NoMatch,
                resultUrl: null,
                message: "No match, the request passes through.",
            };
        }

        const matchEnd = match.index + match[0].length;
        const resultUrl = url.slice(0, match.index) + RedirectTemplate.render(compiled.template, match) + url.slice(matchEnd);
        const missingGroups = compiled.referencedGroups.filter(groupIndex => match[groupIndex] === undefined);
        if (missingGroups.length > 0) {
            const names = missingGroups
                .map(groupIndex => `$${groupIndex}`)
                .join(", ");

            return {
                url,
                outcome: SimulationOutcome.MissingGroup,
                resultUrl,
                message: `${names} missing, the redirect leaves it empty.`,
            };
        }

        return {
            url,
            outcome: SimulationOutcome.Redirected,
            resultUrl,
            message: "Redirects.",
        };
    },
};
