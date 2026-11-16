import { type ContentKind } from '../../Contracts/Timeline/ContentKind';
import type { ContentSignals } from './ContentSignals';

export interface ContentKindClassifier {
    classify(signals: ContentSignals): ContentKind;
}
