import type { RequestDraft } from './RequestDraft';
import type { ResponseDraft } from './ResponseDraft';

export interface MatchFacts {
    request: RequestDraft;
    response: ResponseDraft | null;
}
