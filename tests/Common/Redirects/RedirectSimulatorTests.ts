import { describe, expect, test } from "vitest";
import type { CompiledRedirect } from "../../../src/Common/Redirects/CompiledRedirect";
import { RedirectSimulator } from "../../../src/Common/Redirects/RedirectSimulator";
import { RedirectTemplate } from "../../../src/Common/Redirects/RedirectTemplate";
import { SimulationOutcome } from "../../../src/Common/Redirects/SimulationOutcome";

function compiledOf(regexFilter: string, templateText: string): CompiledRedirect {
    const template = RedirectTemplate.parse(templateText);

    return {
        regexFilter,
        regexSubstitution: RedirectTemplate.toSubstitution(template),
        template,
        referencedGroups: RedirectTemplate.referencedGroups(template),
    };
}

describe("RedirectSimulator", () => {
    test("simulate_WhenRegexIsNotAnchored_ShouldReplaceOnlyTheMatchedPart", () => {
        // Arrange
        const compiled = compiledOf("api\\.example\\.com", "localhost:5000");

        // Act
        const simulation = RedirectSimulator.simulate(compiled, "https://api.example.com/users");

        // Assert
        expect(simulation.outcome).toBe(SimulationOutcome.Redirected);
        expect(simulation.resultUrl).toBe("https://localhost:5000/users");
    });

    test("simulate_WhenRegexUsesPythonSyntax_ShouldReadRe2NamedGroups", () => {
        // Arrange
        const compiled = compiledOf("^https://x\\.com/(?P<id>\\d+)$", "http://localhost/$1");

        // Act
        const simulation = RedirectSimulator.simulate(compiled, "https://x.com/7");

        // Assert
        expect(simulation.resultUrl).toBe("http://localhost/7");
    });

    test("simulate_WhenJavaScriptCannotCompileTheRegex_ShouldReportUnsupported", () => {
        // Arrange
        const compiled = compiledOf("(?i)abc", "x");

        // Act
        const simulation = RedirectSimulator.simulate(compiled, "https://x.com/abc");

        // Assert
        expect(simulation.outcome).toBe(SimulationOutcome.Unsupported);
        expect(simulation.resultUrl).toBeNull();
    });

    test("simulate_WhenUrlDoesNotMatch_ShouldPassThrough", () => {
        // Arrange
        const compiled = compiledOf("^https://api\\.example\\.com/", "http://localhost/");

        // Act
        const simulation = RedirectSimulator.simulate(compiled, "https://cdn.example.com/app.js");

        // Assert
        expect(simulation.outcome).toBe(SimulationOutcome.NoMatch);
        expect(simulation.message).toBe("No match, the request passes through.");
    });
});
