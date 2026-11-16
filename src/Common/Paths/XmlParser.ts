import { OwnEntry } from '../Objects/OwnEntry';
import { Result } from '../Results/Result';
import type { XmlNode } from './XmlNode';

const ATTRIBUTE_PATTERN = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
const ENTITY_MAP: Record<string, string> = Object.freeze({
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
});
const ENTITY_PATTERN = /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g;
const TAG_NAME_PATTERN = /^[^\s/>]+/;
const DECLARATION_PATTERN = /<\?xml[^?]*\?>/g;
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const CDATA_PATTERN = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
const DOCTYPE_PATTERN = /<!DOCTYPE[^>]*>/g;
const AMPERSAND_PATTERN = /&/g;
const LESS_THAN_PATTERN = /</g;
const GREATER_THAN_PATTERN = />/g;
const TAG_OPEN = '<';
const TAG_CLOSE = '>';
const CLOSING_MARKER = '/';
const MAX_CODE_POINT = 0x10FFFF;

function characterOf(code: number, entity: string): string {
    return Number.isFinite(code) && code <= MAX_CODE_POINT ? String.fromCodePoint(code) : entity;
}

function decodeEntity(entity: string): string {
    const named = OwnEntry.of(ENTITY_MAP, entity);
    if (named != null) {
        return named;
    }

    if (entity.startsWith('&#x') || entity.startsWith('&#X')) {
        const code = parseInt(
            /* string: */ entity.slice(3, -1),
            /* radix: */ 16,
        );

        return characterOf(code, entity);
    }

    if (entity.startsWith('&#')) {
        const code = parseInt(
            /* string: */ entity.slice(2, -1),
            /* radix: */ 10,
        );

        return characterOf(code, entity);
    }

    return entity;
}

function decode(text: string): string {
    return text.replace(ENTITY_PATTERN, match => decodeEntity(match));
}

function parseAttributes(tag: string): Record<string, string> {
    const entries = [...tag.matchAll(ATTRIBUTE_PATTERN)].map((match): [string, string] => [
        match[1]!,
        decode(match[3] ?? match[4] ?? ''),
    ]);

    return Object.fromEntries(entries);
}

function nameOf(tag: string): string {
    const match = TAG_NAME_PATTERN.exec(tag);

    return match == null ? '' : match[0];
}

function textOf(node: XmlNode): string {
    return node.content
        .map(part => typeof part === 'string' ? part : textOf(part))
        .join('');
}

export const XmlParser = {
    parse(text: string): Result<XmlNode> {
        const stripped = text
            .replace(DECLARATION_PATTERN, '')
            .replace(COMMENT_PATTERN, '')
            .replace(CDATA_PATTERN, (_match, content: string) => content
                .replace(AMPERSAND_PATTERN, '&amp;')
                .replace(LESS_THAN_PATTERN, '&lt;')
                .replace(GREATER_THAN_PATTERN, '&gt;'))
            .replace(DOCTYPE_PATTERN, '')
            .trim();

        const stack: XmlNode[] = [];
        let root: XmlNode | null = null;
        let position = 0;
        while (position < stripped.length) {
            const openIndex = stripped.indexOf(TAG_OPEN, position);
            if (openIndex === -1) {
                break;
            }

            if (openIndex > position) {
                const parent = stack[stack.length - 1];
                if (parent != null) {
                    const text = decode(stripped.slice(position, openIndex));
                    parent.text += text;
                    parent.content.push(text);
                }
            }

            const closeIndex = stripped.indexOf(TAG_CLOSE, openIndex);
            if (closeIndex === -1) {
                return Result.fail('Unclosed tag.');
            }

            const tag = stripped.slice(openIndex + 1, closeIndex).trim();
            position = closeIndex + 1;

            if (tag.startsWith(CLOSING_MARKER)) {
                const closeName = tag.slice(1).trim();
                const top = stack.pop();
                if (top == null || top.name !== closeName) {
                    return Result.fail(`Mismatched closing tag '${closeName}'.`);
                }

                continue;
            }

            const isSelfClosing = tag.endsWith(CLOSING_MARKER);
            const body = isSelfClosing ? tag.slice(0, -1).trim() : tag;
            const node: XmlNode = {
                name: nameOf(body),
                attributes: parseAttributes(body),
                text: '',
                children: [],
                content: [],
            };
            if (node.name === '') {
                return Result.fail('Element without a name.');
            }

            const parent = stack[stack.length - 1];
            if (parent == null && root != null) {
                return Result.fail('More than one root element.');
            }

            if (parent == null) {
                root = node;
            } else {
                parent.children.push(node);
                parent.content.push(node);
            }

            if (!isSelfClosing) {
                stack.push(node);
            }
        }

        if (root == null) {
            return Result.fail('No root element.');
        }

        if (stack.length > 0) {
            return Result.fail(`Unclosed element '${stack[stack.length - 1]!.name}'.`);
        }

        return Result.ok(root);
    },

    textOf,
};
