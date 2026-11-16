import { CONTENT_KIND, type ContentKind } from '../../Contracts/Timeline/ContentKind';
import type { ContentKindClassifier } from './ContentKindClassifier';
import type { ContentKindRule } from './ContentKindRule';
import type { ContentSignals } from './ContentSignals';
import { FormDataContentRule } from './FormDataContentRule';
import { GraphQlContentRule } from './GraphQlContentRule';
import { JsonContentRule } from './JsonContentRule';

export class DefaultContentKindClassifier implements ContentKindClassifier {
    private readonly _rules: ContentKindRule[];

    constructor(
        rules: ContentKindRule[] = [
            new GraphQlContentRule(),
            new FormDataContentRule(),
            new JsonContentRule(),
        ],
    ) {
        this._rules = rules;
    }

    classify(signals: ContentSignals): ContentKind {
        const rule = this._rules.find(candidate => candidate.matches(signals));

        return rule?.kind ?? CONTENT_KIND.Other;
    }
}
