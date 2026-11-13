const PolicySeparator = ",";
const DirectiveSeparator = ";";
const DirectiveJoiner = "; ";
const PolicyJoiner = ", ";
const NamePattern = /^\s*([^\s]+)/;

function nameOf(directive: string): string {
    return NamePattern.exec(directive)?.[1]?.toLowerCase() ?? "";
}

function policyWithout(policy: string, directiveName: string): string {
    return policy
        .split(DirectiveSeparator)
        .map(directive => directive.trim())
        .filter(directive => directive !== "" && nameOf(directive) !== directiveName)
        .join(DirectiveJoiner);
}

export const CspText = {
    withoutDirective(value: string, directiveName: string): string {
        const name = directiveName.toLowerCase();

        return value
            .split(PolicySeparator)
            .map(policy => policyWithout(policy, name))
            .filter(policy => policy !== "")
            .join(PolicyJoiner);
    },
};
