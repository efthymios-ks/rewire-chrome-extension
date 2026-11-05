import { Result } from "../Results/Result";
import type { XmlNode } from "./XmlNode";

const AttributePattern = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
const EntityMap: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&apos;": "'",
};
const EntityPattern = /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g;
const TagNamePattern = /^[^\s/>]+/;
const DeclarationPattern = /<\?xml[^?]*\?>/g;
const CommentPattern = /<!--[\s\S]*?-->/g;
const CDataPattern = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
const DoctypePattern = /<!DOCTYPE[^>]*>/g;
const AmpersandPattern = /&/g;
const LessThanPattern = /</g;
const GreaterThanPattern = />/g;
const TagOpen = "<";
const TagClose = ">";
const ClosingMarker = "/";

function decodeEntity(entity: string): string {
    if (Object.hasOwn(EntityMap, entity)) {
        return EntityMap[entity]!;
    }

    if (entity.startsWith("&#x") || entity.startsWith("&#X")) {
        const code = parseInt(entity.slice(3, -1), 16);

        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }

    if (entity.startsWith("&#")) {
        const code = parseInt(entity.slice(2, -1), 10);

        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }

    return entity;
}

function decode(text: string): string {
    return text.replace(EntityPattern, match => decodeEntity(match));
}

function parseAttributes(tag: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    AttributePattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = AttributePattern.exec(tag)) !== null) {
        attributes[match[1]!] = decode(match[3] ?? match[4] ?? "");
    }

    return attributes;
}

function nameOf(tag: string): string {
    const match = TagNamePattern.exec(tag);

    return match === null ? "" : match[0];
}

function textOf(node: XmlNode): string {
    if (node.children.length === 0) {
        return node.text;
    }

    return `${node.text}${node.children.map(child => textOf(child)).join("")}`;
}

export const XmlParser = {
    parse(text: string): Result<XmlNode> {
        const stripped = text
            .replace(DeclarationPattern, "")
            .replace(CommentPattern, "")
            .replace(CDataPattern, (_match, content: string) => content
                .replace(AmpersandPattern, "&amp;")
                .replace(LessThanPattern, "&lt;")
                .replace(GreaterThanPattern, "&gt;"))
            .replace(DoctypePattern, "")
            .trim();

        const stack: XmlNode[] = [];
        let root: XmlNode | null = null;
        let position = 0;
        while (position < stripped.length) {
            const openIndex = stripped.indexOf(TagOpen, position);
            if (openIndex === -1) {
                break;
            }

            if (openIndex > position) {
                const parent = stack[stack.length - 1];
                if (parent !== undefined) {
                    parent.text += decode(stripped.slice(position, openIndex));
                }
            }

            const closeIndex = stripped.indexOf(TagClose, openIndex);
            if (closeIndex === -1) {
                return Result.fail("Unclosed tag.");
            }

            const tag = stripped.slice(openIndex + 1, closeIndex).trim();
            position = closeIndex + 1;

            if (tag.startsWith(ClosingMarker)) {
                const closeName = tag.slice(1).trim();
                const top = stack.pop();
                if (top === undefined || top.name !== closeName) {
                    return Result.fail(`Mismatched closing tag '${closeName}'.`);
                }

                continue;
            }

            const isSelfClosing = tag.endsWith(ClosingMarker);
            const body = isSelfClosing ? tag.slice(0, -1).trim() : tag;
            const node: XmlNode = {
                name: nameOf(body),
                attributes: parseAttributes(body),
                text: "",
                children: [],
            };
            if (node.name === "") {
                return Result.fail("Element without a name.");
            }

            const parent = stack[stack.length - 1];
            if (parent !== undefined) {
                parent.children.push(node);
            } else if (root === null) {
                root = node;
            } else {
                return Result.fail("More than one root element.");
            }

            if (!isSelfClosing) {
                stack.push(node);
            }
        }

        if (root === null) {
            return Result.fail("No root element.");
        }

        if (stack.length > 0) {
            return Result.fail(`Unclosed element '${stack[stack.length - 1]!.name}'.`);
        }

        return Result.ok(root);
    },

    textOf,
};
