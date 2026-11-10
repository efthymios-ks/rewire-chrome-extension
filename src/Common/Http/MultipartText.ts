import { type MultipartPart, SnippetBodies } from "../CodeGen/SnippetBody";

const BoundaryPattern = /boundary=("?)([^";]+)\1/i;
const HeaderBodySeparatorPattern = /\r?\n\r?\n/;
const LineBreakPattern = /\r?\n/;
const TrailingLineBreakPattern = /\r?\n$/;
const NamePattern = /\bname="([^"]*)"/i;
const FileNamePattern = /\bfilename="([^"]*)"/i;
const ContentTypeLinePattern = /^content-type:\s*(.+)$/i;
const DispositionLinePattern = /^content-disposition:/i;
const BoundaryPrefix = "--";
const LeadingLineBreakPattern = /^\r?\n/;
const MinimumSections = 3;

function headerLines(head: string): string[] {
    return head
        .split(LineBreakPattern)
        .map(line => line.trim())
        .filter(line => line !== "");
}

function partOf(section: string): MultipartPart | null {
    const separator = HeaderBodySeparatorPattern.exec(section);
    if (separator === null) {
        return null;
    }

    const lines = headerLines(section.slice(0, separator.index));
    const disposition = lines.find(line => DispositionLinePattern.test(line)) ?? "";
    const name = NamePattern.exec(disposition)?.[1];
    if (name === undefined) {
        return null;
    }

    const fileName = FileNamePattern.exec(disposition)?.[1];
    const contentType = lines
        .map(line => ContentTypeLinePattern.exec(line)?.[1])
        .find(value => value !== undefined) ?? "";
    if (fileName !== undefined) {
        return SnippetBodies.filePart(
            name,
            fileName,
            contentType.trim()
        );
    }

    const value = section
        .slice(separator.index + separator[0].length)
        .replace(TrailingLineBreakPattern, "");

    return SnippetBodies.textPart(name, value);
}

export const MultipartText = {
    boundaryOf(contentType: string): string | null {
        return BoundaryPattern.exec(contentType)?.[2] ?? null;
    },

    parse(text: string, contentType: string): MultipartPart[] | null {
        const boundary = MultipartText.boundaryOf(contentType);
        if (boundary === null) {
            return null;
        }

        const sections = text.split(`${BoundaryPrefix}${boundary}`);
        if (sections.length < MinimumSections) {
            return null;
        }

        return sections
            .slice(1, -1)
            .map(section => section.replace(LeadingLineBreakPattern, ""))
            .map(partOf)
            .filter((part): part is MultipartPart => part !== null);
    },
};
