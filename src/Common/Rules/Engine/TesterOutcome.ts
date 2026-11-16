import type { SyntheticResponse } from '../Drafts/SyntheticResponse';
import type { TesterOutcomeKind } from './TesterOutcomeKind';

export interface TesterOutcome {
    kind: TesterOutcomeKind;
    url: string;
    response: SyntheticResponse | null;
}
