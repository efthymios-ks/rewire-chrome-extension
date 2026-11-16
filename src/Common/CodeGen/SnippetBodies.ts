import type { MultipartPart } from './MultipartPart';
import type { SnippetBody } from './SnippetBody';
import { SNIPPET_BODY_KIND } from './SnippetBodyKind';

export interface FilePartOptions {
    name: string;
    fileName: string;
    contentType: string;
}

export const SnippetBodies = {
    none(): SnippetBody {
        return {
            kind: SNIPPET_BODY_KIND.None,
        };
    },

    text(text: string): SnippetBody {
        return text === ''
            ? SnippetBodies.none()
            : {
                kind: SNIPPET_BODY_KIND.Text,
                text,
            };
    },

    multipart(parts: MultipartPart[]): SnippetBody {
        return parts.length === 0
            ? SnippetBodies.none()
            : {
                kind: SNIPPET_BODY_KIND.Multipart,
                parts,
            };
    },

    file(fileName: string): SnippetBody {
        return {
            kind: SNIPPET_BODY_KIND.File,
            fileName,
        };
    },

    textPart(name: string, value: string): MultipartPart {
        return {
            name,
            value,
            fileName: null,
            contentType: '',
        };
    },

    filePart({ name, fileName, contentType }: FilePartOptions): MultipartPart {
        return {
            name,
            value: '',
            fileName,
            contentType,
        };
    },

    hasBody(body: SnippetBody): boolean {
        return body.kind !== SNIPPET_BODY_KIND.None;
    },
};
