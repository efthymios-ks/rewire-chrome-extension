import { describe, expect, test } from 'vitest';
import { RegexRedirectCompiler } from './RegexRedirectCompiler';
import { RedirectSimulator } from './RedirectSimulator';
import { SIMULATION_OUTCOME } from './SimulationOutcome';

const compiler = new RegexRedirectCompiler();

interface CompileRegexOptions {
    source: string;
    target: string;
    strictParameters: boolean;
}

function compileRegex({ source, target, strictParameters }: CompileRegexOptions) {
    return compiler.compile({
        source,
        target,
        strictParameters,
    });
}

describe('RegexRedirectCompiler', () => {
    test('compile_WhenUrlCarriesIt_ShouldSubstituteTheCapturedId', () => {
        // Arrange
        const compiled = compileRegex({
            source: '^https://api\\.example\\.com/api/v1/users/(\\d+)/profile$',
            target: 'http://localhost:5000/users/$1/profile',
            strictParameters: true,
        });
        if (compiled.hasErrors) {
            throw new Error(compiled.error);
        }

        // Act
        const simulation = RedirectSimulator.simulate(
            /* compiled: */ compiled.value,
            /* url: */ 'https://api.example.com/api/v1/users/42/profile',
        );

        // Assert
        expect(compiled.value.regexSubstitution).toBe('http://localhost:5000/users/\\1/profile');
        expect(simulation.outcome).toBe(SIMULATION_OUTCOME.Redirected);
        expect(simulation.resultUrl).toBe('http://localhost:5000/users/42/profile');
    });

    test('compile_WhenStrictAndTheGroupIsMissing_ShouldPassTheRequestThrough', () => {
        // Arrange
        const compiled = compileRegex({
            source: '^https://api\\.example\\.com/users(?:/(\\d+))?$',
            target: 'http://localhost/users/$1',
            strictParameters: true,
        });
        if (compiled.hasErrors) {
            throw new Error(compiled.error);
        }

        // Act
        const simulation = RedirectSimulator.simulate(compiled.value, 'https://api.example.com/users');

        // Assert
        expect(compiled.value.regexFilter).toBe('^https://api\\.example\\.com/users(?:/(\\d+))$');
        expect(simulation.outcome).toBe(SIMULATION_OUTCOME.NoMatch);
    });

    test('compile_WhenNotStrictAndTheGroupIsMissing_ShouldReportTheMissingGroup', () => {
        // Arrange
        const compiled = compileRegex({
            source: '^https://api\\.example\\.com/users(?:/(\\d+))?$',
            target: 'http://localhost/users/$1',
            strictParameters: false,
        });
        if (compiled.hasErrors) {
            throw new Error(compiled.error);
        }

        // Act
        const simulation = RedirectSimulator.simulate(compiled.value, 'https://api.example.com/users');

        // Assert
        expect(simulation.outcome).toBe(SIMULATION_OUTCOME.MissingGroup);
        expect(simulation.resultUrl).toBe('http://localhost/users/');
    });

    test('compile_WhenTemplateUsesAGroupTheRegexLacks_ShouldFail', () => {
        // Arrange
        const source = '^https://api\\.example\\.com/users/(\\d+)$';

        // Act
        const compiled = compileRegex({ source, target: 'http://localhost/$1/$2', strictParameters: false });

        // Assert
        const error = compiled.hasErrors ? compiled.error : '';
        expect(error).toBe('Template uses $2, but the regex has 1 capture group(s).');
    });

    test.each([
        [
            '',
            'http://localhost',
            'Regex is required.',
        ],
        [
            '^https://x$',
            ' ',
            'Redirect template is required.',
        ],
    ])("compile_WhenSourceAndTemplateAre('%s', '%s')_ShouldFail", (
        source,
        target,
        expectedMessage,
    ) => {
        // Arrange
        const strictParameters = false;

        // Act
        const compiled = compileRegex({ source, target, strictParameters });

        // Assert
        expect(compiled.hasErrors ? compiled.error : '').toBe(expectedMessage);
    });
});
