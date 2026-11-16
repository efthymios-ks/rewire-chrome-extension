import { Result } from '../Results/Result';

const JSON_INDENTATION = 2;

export const JsonText = {
    tryParse(text: string): Result<unknown> {
        return Result.attempt(() => JSON.parse(text) as unknown);
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
            /* value: */ value,
            /* replacer: */ null,
            /* space: */ JSON_INDENTATION,
        );
    },
};
