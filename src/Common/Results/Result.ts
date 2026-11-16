import { ErrorText } from '../Errors/ErrorText';

export interface Success<TValue> {
    readonly hasErrors: false;
    readonly value: TValue;
}

export interface Failure {
    readonly hasErrors: true;
    readonly error: string;
}

export type Result<TValue> = Success<TValue> | Failure;

function failureTextOf(error: unknown, failurePrefix: string | undefined): string {
    const text = ErrorText.of(error);

    return failurePrefix == null ? text : `${failurePrefix}: ${text}`;
}

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

    attempt<TValue>(action: () => TValue, failurePrefix?: string): Result<TValue> {
        try {
            return Result.ok(action());
        } catch (error) {
            return Result.fail(failureTextOf(error, failurePrefix));
        }
    },

    async attemptAsync<TValue>(
        action: () => Promise<TValue>,
        failurePrefix?: string,
    ): Promise<Result<TValue>> {
        try {
            return Result.ok(await action());
        } catch (error) {
            return Result.fail(failureTextOf(error, failurePrefix));
        }
    },
};
