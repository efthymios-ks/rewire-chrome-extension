import type { HeaderEntry } from '../../Contracts/Timeline/HeaderEntry';
import type { CookiePair } from '../Rules/Http/CookiePair';
import type { SnippetBody } from './SnippetBody';

export interface SnippetRequest {
    method: string;
    url: string;
    headers: HeaderEntry[];
    cookies: CookiePair[];
    body: SnippetBody;
}
