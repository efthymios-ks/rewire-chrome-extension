import { XmlParser } from "../Paths/XmlParser";

const TokenPattern = /<[^>]+>|[^<]+/g;
const Indentation = "  ";
const ClosingPrefix = "</";
const SelfClosingSuffix = "/>";
const SpecialPrefixes = [
    "<?",
    "<!",
];
const CDataMarker = "<![CDATA[";

function isTag(token: string): boolean {
    return token.startsWith("<");
}

function isClosing(token: string): boolean {
    return token.startsWith(ClosingPrefix);
}

function isOpening(token: string): boolean {
    return isTag(token)
        && !isClosing(token)
        && !token.endsWith(SelfClosingSuffix)
        && !SpecialPrefixes.some(prefix => token.startsWith(prefix));
}

function tokensOf(text: string): string[] {
    return (text.match(TokenPattern) ?? [])
        .map(token => isTag(token) ? token : token.trim())
        .filter(token => token !== "");
}

export const XmlText = {
    format(text: string): string {
        if (text.includes(CDataMarker) || XmlParser.parse(text).hasErrors) {
            return text;
        }

        const tokens = tokensOf(text);
        const lines: string[] = [];
        let depth = 0;
        for (let index = 0; index < tokens.length; index++) {
            const token = tokens[index]!;
            if (isClosing(token)) {
                depth = Math.max(0, depth - 1);
                lines.push(`${Indentation.repeat(depth)}${token}`);
                continue;
            }

            const next = tokens[index + 1];
            const afterNext = tokens[index + 2];
            const isTextLeaf = isOpening(token) && next !== undefined && !isTag(next) && afterNext !== undefined && isClosing(afterNext);
            if (isTextLeaf) {
                lines.push(`${Indentation.repeat(depth)}${token}${next}${afterNext}`);
                index += 2;
                continue;
            }

            lines.push(`${Indentation.repeat(depth)}${token}`);
            depth += isOpening(token) ? 1 : 0;
        }

        return lines.join("\n");
    },
};
