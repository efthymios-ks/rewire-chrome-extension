import type { MultipartPart } from './MultipartPart';
import type { SNIPPET_BODY_KIND } from './SnippetBodyKind';

export type SnippetBody =
    | {
        kind: typeof SNIPPET_BODY_KIND.None;
    }
    | {
        kind: typeof SNIPPET_BODY_KIND.Text;
        text: string;
    }
    | {
        kind: typeof SNIPPET_BODY_KIND.Multipart;
        parts: MultipartPart[];
    }
    | {
        kind: typeof SNIPPET_BODY_KIND.File;
        fileName: string;
    };
