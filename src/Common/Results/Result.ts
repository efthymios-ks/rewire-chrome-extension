export interface Success<TValue> {
    readonly hasErrors: false;
    readonly value: TValue;
}

export interface Failure {
    readonly hasErrors: true;
    readonly error: string;
}

export type Result<TValue> = Success<TValue> | Failure;

export const Result = {
    ok<TValue>(value: TValue): Result<TValue> {
        return {
            hasErrors: false,
            value,
        };
    },

    done(): Result<void> {
        return {
            hasErrors: false,
            value: undefined,
        };
    },

    fail(error: string): Failure {
        return {
            hasErrors: true,
            error,
        };
    },
};
