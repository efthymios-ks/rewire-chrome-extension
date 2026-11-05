import { ContentKind } from "../../Contracts/Timeline/ContentKind";
import type { ContentSignals } from "./ContentSignals";
import { FormDataContentRule } from "./FormDataContentRule";
import { GraphQlContentRule } from "./GraphQlContentRule";
import type { IContentKindRule } from "./IContentKindRule";
import { JsonContentRule } from "./JsonContentRule";

export interface IContentKindClassifier {
    classify(signals: ContentSignals): ContentKind;
}

export class ContentKindClassifier implements IContentKindClassifier {
    private readonly _rules: IContentKindRule[];

    constructor(
        rules: IContentKindRule[] = [
            new GraphQlContentRule(),
            new FormDataContentRule(),
            new JsonContentRule(),
        ]
    ) {
        this._rules = rules;
    }

    classify(signals: ContentSignals): ContentKind {
        const rule = this._rules.find(candidate => candidate.matches(signals));

        return rule?.kind ?? ContentKind.Other;
    }
}
