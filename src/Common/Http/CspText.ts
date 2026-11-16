const POLICY_SEPARATOR = ',';
const DIRECTIVE_SEPARATOR = ';';
const DIRECTIVE_JOINER = '; ';
const POLICY_JOINER = ', ';
const NAME_PATTERN = /^\s*([^\s]+)/;

function nameOf(directive: string): string {
    return NAME_PATTERN.exec(directive)?.[1]?.toLowerCase() ?? '';
}

function policyWithout(policy: string, directiveName: string): string {
    return policy
        .split(DIRECTIVE_SEPARATOR)
        .map(directive => directive.trim())
        .filter(directive => directive !== '' && nameOf(directive) !== directiveName)
        .join(DIRECTIVE_JOINER);
}

export const CspText = {
    withoutDirective(value: string, directiveName: string): string {
        const name = directiveName.toLowerCase();

        return value
            .split(POLICY_SEPARATOR)
            .map(policy => policyWithout(policy, name))
            .filter(policy => policy !== '')
            .join(POLICY_JOINER);
    },
};
