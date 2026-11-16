import { describe, expect, test } from 'vitest';
import type { CompiledRedirect } from './CompiledRedirect';
import { RedirectSimulator } from './RedirectSimulator';
import { RedirectTemplate } from './RedirectTemplate';
import { SIMULATION_OUTCOME } from './SimulationOutcome';

function compiledOf(regexFilter: string, templateText: string): CompiledRedirect {
    const template = RedirectTemplate.parse(templateText);

    return {
        regexFilter,
        regexSubstitution: RedirectTemplate.toSubstitution(template),
        template,
        referencedGroups: RedirectTemplate.referencedGroups(template),
    };
}

describe('RedirectSimulator', () => {
    test('simulate_WhenRegexIsNotAnchored_ShouldReplaceOnlyTheMatchedPart', () => {
        // Arrange
        const compiled = compiledOf('api\\.example\\.com', 'localhost:5000');

        // Act
        const simulation = RedirectSimulator.simulate(compiled, 'https://api.example.com/users');

        // Assert
        expect(simulation.outcome).toBe(SIMULATION_OUTCOME.Redirected);
        expect(simulation.resultUrl).toBe('https://localhost:5000/users');
    });

    test('simulate_WhenRegexUsesPythonSyntax_ShouldReadRe2NamedGroups', () => {
        // Arrange
        const compiled = compiledOf('^https://x\\.com/(?P<id>\\d+)$', 'http://localhost/$1');

        // Act
        const simulation = RedirectSimulator.simulate(compiled, 'https://x.com/7');

        // Assert
        expect(simulation.resultUrl).toBe('http://localhost/7');
    });

    test('simulate_WhenJavaScriptCannotCompileTheRegex_ShouldReportUnsupported', () => {
        // Arrange
        const compiled = compiledOf('(?i)abc', 'x');

        // Act
        const simulation = RedirectSimulator.simulate(compiled, 'https://x.com/abc');

        // Assert
        expect(simulation.outcome).toBe(SIMULATION_OUTCOME.Unsupported);
        expect(simulation.resultUrl).toBeNull();
    });

    test('simulate_WhenUrlDiffersOnlyInCase_ShouldRedirectLikeTheBrowserEngine', () => {
        // Arrange
        const compiled = compiledOf('/USERS/([0-9]+)', '/accounts/$1');

        // Act
        const simulation = RedirectSimulator.simulate(compiled, 'https://api.example.com/users/42');

        // Assert
        expect(simulation.outcome).toBe(SIMULATION_OUTCOME.Redirected);
        expect(simulation.resultUrl).toBe('https://api.example.com/accounts/42');
    });

    test('simulate_WhenUrlDoesNotMatch_ShouldPassThrough', () => {
        // Arrange
        const compiled = compiledOf('^https://api\\.example\\.com/', 'http://localhost/');

        // Act
        const simulation = RedirectSimulator.simulate(compiled, 'https://cdn.example.com/app.js');

        // Assert
        expect(simulation.outcome).toBe(SIMULATION_OUTCOME.NoMatch);
        expect(simulation.message).toBe('No match, the request passes through.');
    });
});
