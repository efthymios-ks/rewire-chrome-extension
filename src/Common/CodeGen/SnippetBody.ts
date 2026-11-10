export enum SnippetBodyKind {
    None = 1,
    Text = 2,
    Multipart = 3,
    File = 4,
}

export interface MultipartPart {
    name: string;
    value: string;
    fileName: string | null;
    contentType: string;
}

export type SnippetBody =
    | {
        kind: SnippetBodyKind.None;
    }
    | {
        kind: SnippetBodyKind.Text;
        text: string;
    }
    | {
        kind: SnippetBodyKind.Multipart;
        parts: MultipartPart[];
    }
    | {
        kind: SnippetBodyKind.File;
        fileName: string;
    };

export const SnippetBodies = {
    none(): SnippetBody {
        return {
            kind: SnippetBodyKind.None,
        };
    },

    text(text: string): SnippetBody {
        return text === ""
            ? SnippetBodies.none()
            : {
                kind: SnippetBodyKind.Text,
                text,
            };
    },

    multipart(parts: MultipartPart[]): SnippetBody {
        return parts.length === 0
            ? SnippetBodies.none()
            : {
                kind: SnippetBodyKind.Multipart,
                parts,
            };
    },

    file(fileName: string): SnippetBody {
        return {
            kind: SnippetBodyKind.File,
            fileName,
        };
    },

    textPart(name: string, value: string): MultipartPart {
        return {
            name,
            value,
            fileName: null,
            contentType: "",
        };
    },

    filePart(
        name: string,
        fileName: string,
        contentType: string
    ): MultipartPart {
        return {
            name,
            value: "",
            fileName,
            contentType,
        };
    },

    hasBody(body: SnippetBody): boolean {
        return body.kind !== SnippetBodyKind.None;
    },
};
