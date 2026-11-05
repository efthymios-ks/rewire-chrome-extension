import { ErrorText } from "../Errors/ErrorText";
import { Result } from "../Results/Result";

const JsonIndentation = 2;

export const JsonText = {
    tryParse(text: string): Result<unknown> {
        try {
            return Result.ok(JSON.parse(text) as unknown);
        } catch (error) {
            return Result.fail(ErrorText.of(error));
        }
    },

    format(text: string): string {
        const parsed = JsonText.tryParse(text);
        if (parsed.hasErrors) {
            return text;
        }

        return JsonText.stringify(parsed.value);
    },

    stringify(value: unknown): string {
        return JSON.stringify(
            value,
            null,
            JsonIndentation
        );
    },
};
