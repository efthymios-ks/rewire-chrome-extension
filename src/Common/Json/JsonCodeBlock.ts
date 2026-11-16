const FENCED_BLOCK_PATTERN = /```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)```/;

export const JsonCodeBlock = {
    of(text: string): string {
        const block = FENCED_BLOCK_PATTERN.exec(text);

        return (block?.[1] ?? text).trim();
    },
};
