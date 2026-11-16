import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';
import type { CookiePair } from '../Rules/Http/CookiePair';
import type { SnippetBody } from './SnippetBody';

export interface RequestSnippet {
    readonly method: string;
    readonly url: string;
    readonly headers: HeaderEntry[];
    readonly cookies: CookiePair[];
    body: SnippetBody;
    toString(): string;
}
