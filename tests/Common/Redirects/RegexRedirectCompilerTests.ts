import { describe, expect, test } from "vitest";
import { RegexRedirectCompiler } from "../../../src/Common/Redirects/RegexRedirectCompiler";
import { RedirectSimulator } from "../../../src/Common/Redirects/RedirectSimulator";
import { SimulationOutcome } from "../../../src/Common/Redirects/SimulationOutcome";
import { RedirectKind } from "../../../src/Common/Redirects/RedirectDefinition";

const compiler = new RegexRedirectCompiler();

function compileRegex(
    source: string,
    target: string,
    strictParameters: boolean
) {
    return compiler.compile({
        kind: RedirectKind.Regex,
        source,
        target,
        strictParameters,
    });
}

describe("RegexRedirectCompiler", () => {
    test("compile_WhenUrlCarriesIt_ShouldSubstituteTheCapturedId", () => {
        // Arrange
        const compiled = compileRegex(
            "^https://api\\.example\\.com/api/v1/users/(\\d+)/profile$",
            "http://localhost:5000/users/$1/profile",
            true
        );
        if (compiled.hasErrors) {
            throw new Error(compiled.error);
        }

        // Act
        const simulation = RedirectSimulator.simulate(compiled.value, "https://api.example.com/api/v1/users/42/profile");

        // Assert
        expect(compiled.value.regexSubstitution).toBe("http://localhost:5000/users/\\1/profile");
        expect(simulation.outcome).toBe(SimulationOutcome.Redirected);
        expect(simulation.resultUrl).toBe("http://localhost:5000/users/42/profile");
    });

    test("compile_WhenStrictAndTheGroupIsMissing_ShouldPassTheRequestThrough", () => {
        // Arrange
        const compiled = compileRegex(
            "^https://api\\.example\\.com/users(?:/(\\d+))?$",
            "http://localhost/users/$1",
            true
        );
        if (compiled.hasErrors) {
            throw new Error(compiled.error);
        }

        // Act
        const simulation = RedirectSimulator.simulate(compiled.value, "https://api.example.com/users");

        // Assert
        expect(compiled.value.regexFilter).toBe("^https://api\\.example\\.com/users(?:/(\\d+))$");
        expect(simulation.outcome).toBe(SimulationOutcome.NoMatch);
    });

    test("compile_WhenNotStrictAndTheGroupIsMissing_ShouldReportTheMissingGroup", () => {
        // Arrange
        const compiled = compileRegex(
            "^https://api\\.example\\.com/users(?:/(\\d+))?$",
            "http://localhost/users/$1",
            false
        );
        if (compiled.hasErrors) {
            throw new Error(compiled.error);
        }

        // Act
        const simulation = RedirectSimulator.simulate(compiled.value, "https://api.example.com/users");

        // Assert
        expect(simulation.outcome).toBe(SimulationOutcome.MissingGroup);
        expect(simulation.resultUrl).toBe("http://localhost/users/");
    });

    test("compile_WhenTemplateUsesAGroupTheRegexLacks_ShouldFail", () => {
        // Arrange
        const source = "^https://api\\.example\\.com/users/(\\d+)$";

        // Act
        const compiled = compileRegex(
            source,
            "http://localhost/$1/$2",
            false
        );

        // Assert
        expect(compiled.hasErrors ? compiled.error : "").toBe("Template uses $2, but the regex has 1 capture group(s).");
    });

    test.each([
        [
            "",
            "http://localhost",
            "Regex is required.",
        ],
        [
            "^https://x$",
            " ",
            "Redirect template is required.",
        ],
    ])("compile_WhenSourceAndTemplateAre('%s', '%s')_ShouldFail", (
        source,
        target,
        expectedMessage
    ) => {
        // Arrange
        const strictParameters = false;

        // Act
        const compiled = compileRegex(
            source,
            target,
            strictParameters
        );

        // Assert
        expect(compiled.hasErrors ? compiled.error : "").toBe(expectedMessage);
    });
});
