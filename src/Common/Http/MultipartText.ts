import type { MultipartPart } from '../CodeGen/MultipartPart';
import { SnippetBodies } from '../CodeGen/SnippetBodies';

const BOUNDARY_PATTERN = /boundary=("?)([^";]+)\1/i;
const HEADER_BODY_SEPARATOR_PATTERN = /\r?\n\r?\n/;
const LINE_BREAK_PATTERN = /\r?\n/;
const TRAILING_LINE_BREAK_PATTERN = /\r?\n$/;
const NAME_PATTERN = /\bname="([^"]*)"/i;
const FILE_NAME_PATTERN = /\bfilename="([^"]*)"/i;
const CONTENT_TYPE_LINE_PATTERN = /^content-type:\s*(.+)$/i;
const DISPOSITION_LINE_PATTERN = /^content-disposition:/i;
const BOUNDARY_PREFIX = '--';
const LEADING_LINE_BREAK_PATTERN = /^\r?\n/;
const MINIMUM_SECTIONS = 3;

function headerLines(head: string): string[] {
    return head
        .split(LINE_BREAK_PATTERN)
        .map(line => line.trim())
        .filter(line => line !== '');
}

function partOf(section: string): MultipartPart | null {
    const separator = HEADER_BODY_SEPARATOR_PATTERN.exec(section);
    if (separator == null) {
        return null;
    }

    const lines = headerLines(section.slice(0, separator.index));
    const disposition = lines.find(line => DISPOSITION_LINE_PATTERN.test(line)) ?? '';
    const name = NAME_PATTERN.exec(disposition)?.[1];
    if (name == null) {
        return null;
    }

    const fileName = FILE_NAME_PATTERN.exec(disposition)?.[1];
    const contentType = lines
        .map(line => CONTENT_TYPE_LINE_PATTERN.exec(line)?.[1])
        .find(value => value != null) ?? '';
    if (fileName != null) {
        return SnippetBodies.filePart({
            name,
            fileName,
            contentType: contentType.trim(),
        });
    }

    const value = section
        .slice(separator.index + separator[0].length)
        .replace(TRAILING_LINE_BREAK_PATTERN, '');

    return SnippetBodies.textPart(name, value);
}

export const MultipartText = {
    boundaryOf(contentType: string): string | null {
        return BOUNDARY_PATTERN.exec(contentType)?.[2] ?? null;
    },

    parse(text: string, contentType: string): MultipartPart[] | null {
        const boundary = MultipartText.boundaryOf(contentType);
        if (boundary == null) {
            return null;
        }

        const sections = text.split(`${BOUNDARY_PREFIX}${boundary}`);
        if (sections.length < MINIMUM_SECTIONS) {
            return null;
        }

        return sections
            .slice(1, -1)
            .map(section => section.replace(LEADING_LINE_BREAK_PATTERN, ''))
            .map(partOf)
            .filter((part): part is MultipartPart => part != null);
    },
};
