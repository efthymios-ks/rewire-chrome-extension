import type { RequestSnapshot } from './RequestSnapshot';
import type { RequestSnippet } from './RequestSnippet';
import type { SnippetOptions } from './SnippetOptions';

export interface RequestSnippetType {
    readonly id: string;
    readonly label: string;
    tryParse(text: string): RequestSnippet | null;
    from(snapshot: RequestSnapshot, options?: SnippetOptions): RequestSnippet;
}
