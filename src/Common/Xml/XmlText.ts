import { XmlParser } from '../Paths/XmlParser';

const TOKEN_PATTERN = /<[^>]+>|[^<]+/g;
const INDENTATION = '  ';
const CLOSING_PREFIX = '</';
const SELF_CLOSING_SUFFIX = '/>';
const SPECIAL_PREFIXES = [
    '<?',
    '<!',
];
const CDATA_MARKER = '<![CDATA[';

function isTag(token: string): boolean {
    return token.startsWith('<');
}

function isClosing(token: string): boolean {
    return token.startsWith(CLOSING_PREFIX);
}

function isOpening(token: string): boolean {
    return isTag(token)
        && !isClosing(token)
        && !token.endsWith(SELF_CLOSING_SUFFIX)
        && !SPECIAL_PREFIXES.some(prefix => token.startsWith(prefix));
}

function tokensOf(text: string): string[] {
    return (text.match(TOKEN_PATTERN) ?? [])
        .map(token => isTag(token) ? token : token.trim())
        .filter(token => token !== '');
}

export const XmlText = {
    format(text: string): string {
        if (text.includes(CDATA_MARKER) || XmlParser.parse(text).hasErrors) {
            return text;
        }

        const tokens = tokensOf(text);
        const lines: string[] = [];
        let depth = 0;
        for (let index = 0; index < tokens.length; index++) {
            const token = tokens[index]!;
            if (isClosing(token)) {
                depth = Math.max(0, depth - 1);
                lines.push(`${INDENTATION.repeat(depth)}${token}`);
                continue;
            }

            const next = tokens[index + 1];
            const afterNext = tokens[index + 2];
            const isTextLeaf = isOpening(token)
                && next != null
                && !isTag(next)
                && afterNext != null
                && isClosing(afterNext);
            if (isTextLeaf) {
                lines.push(`${INDENTATION.repeat(depth)}${token}${next}${afterNext}`);
                index += 2;
                continue;
            }

            lines.push(`${INDENTATION.repeat(depth)}${token}`);
            depth += isOpening(token) ? 1 : 0;
        }

        return lines.join('\n');
    },
};
