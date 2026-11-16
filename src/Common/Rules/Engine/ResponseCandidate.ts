import type { PipelineEntry } from './PipelineEntry';

export interface ResponseCandidate {
    entry: PipelineEntry;
    isPreMatched: boolean;
}
