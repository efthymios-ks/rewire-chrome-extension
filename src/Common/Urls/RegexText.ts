const RegexSpecialCharacterPattern = /[.*+?^${}()|[\]\\]/g;

export const RegexText = {
    escape(text: string): string {
        return text.replace(RegexSpecialCharacterPattern, "\\$&");
    },
};
