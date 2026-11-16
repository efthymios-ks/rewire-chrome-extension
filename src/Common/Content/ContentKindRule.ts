import type { ContentKind } from '../../Contracts/Timeline/ContentKind';
import type { ContentSignals } from './ContentSignals';

export interface ContentKindRule {
    readonly kind: ContentKind;
    matches(signals: ContentSignals): boolean;
}
