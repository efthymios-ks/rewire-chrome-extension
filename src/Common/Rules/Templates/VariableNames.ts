const VARIABLE_NAME_PATTERN = /^[A-Za-z_][\w.-]*$/;

export const VariableNames = {
    RuleMessage: 'Variable names start with a letter or _ and use letters, digits, _ . -.',

    isValid(name: string): boolean {
        return VARIABLE_NAME_PATTERN.test(name);
    },
};
