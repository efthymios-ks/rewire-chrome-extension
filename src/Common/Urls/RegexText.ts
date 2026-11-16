const REGEX_SPECIAL_CHARACTER_PATTERN = /[.*+?^${}()|[\]\\]/g;

export const RegexText = {
    escape(text: string): string {
        return text.replace(REGEX_SPECIAL_CHARACTER_PATTERN, '\\$&');
    },
};
