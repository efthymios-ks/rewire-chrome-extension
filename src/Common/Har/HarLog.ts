import type { HarCreator } from './HarCreator';
import type { HarEntry } from './HarEntry';

export interface HarLog {
    version: string;
    creator: HarCreator;
    pages: never[];
    entries: HarEntry[];
}
