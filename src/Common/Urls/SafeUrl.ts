export const SafeUrl = {
    parse(text: string): URL | null {
        if (!URL.canParse(text)) {
            return null;
        }

        return new URL(text);
    },
};
