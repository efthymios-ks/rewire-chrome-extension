const LIST_SEPARATOR_PATTERN = /[\s,]+/;

export function criterionValuesOf(text: string): string[] {
    return text
        .split(LIST_SEPARATOR_PATTERN)
        .map(item => item.trim().toLowerCase())
        .filter(item => item.length > 0);
}
