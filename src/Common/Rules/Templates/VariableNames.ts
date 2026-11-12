const VariableNamePattern = /^[A-Za-z_][\w.-]*$/;

export const VariableNames = {
    Rule: "Variable names start with a letter or _ and use letters, digits, _ . -.",

    isValid(name: string): boolean {
        return VariableNamePattern.test(name);
    },
};
