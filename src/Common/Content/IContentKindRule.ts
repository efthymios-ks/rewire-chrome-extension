import type { ContentKind } from "../../Contracts/Timeline/ContentKind";
import type { ContentSignals } from "./ContentSignals";

export interface IContentKindRule {
    readonly kind: ContentKind;
    matches(signals: ContentSignals): boolean;
}
