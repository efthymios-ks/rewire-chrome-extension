import type { ProfileVariable } from "../../Contracts/Settings/ProfileVariable";

const SecretNameWords = [
    "auth",
    "cookie",
    "key",
    "pass",
    "secret",
    "session",
    "token",
];

export const ProfileVariables = {
    mapOf(variables: ProfileVariable[]): Map<string, string> {
        return new Map(variables.map(variable => [
            variable.name,
            variable.value,
        ]));
    },

    valueOf(variables: ProfileVariable[], name: string): string | null {
        return variables.find(variable => variable.name === name)?.value ?? null;
    },

    looksSecret(name: string): boolean {
        const lowerName = name.toLowerCase();

        return SecretNameWords.some(word => lowerName.includes(word));
    },

    withoutSecrets(variables: ProfileVariable[]): ProfileVariable[] {
        return variables.map(variable => ProfileVariables.looksSecret(variable.name)
            ? {
                ...variable,
                value: "",
            }
            : variable);
    },

    mergeByName(current: ProfileVariable[], incoming: ProfileVariable[]): ProfileVariable[] {
        const currentNames = new Set(current.map(variable => variable.name));

        return [
            ...current.map(variable => incoming.find(candidate => candidate.name === variable.name) ?? variable),
            ...incoming.filter(variable => !currentNames.has(variable.name)),
        ];
    },
};
