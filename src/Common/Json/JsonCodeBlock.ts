const FencedBlockPattern = /```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)```/;

export const JsonCodeBlock = {
    of(text: string): string {
        const block = FencedBlockPattern.exec(text);

        return (block?.[1] ?? text).trim();
    },
};
