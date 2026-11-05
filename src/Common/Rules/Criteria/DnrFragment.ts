export type DnrCondition = chrome.declarativeNetRequest.RuleCondition;

export enum DnrFragmentKind {
    Condition = 1,
    Regex = 2,
    Unsupported = 3,
}

export type DnrFragment =
    | {
        kind: DnrFragmentKind.Condition;
        patch: DnrCondition;
    }
    | {
        kind: DnrFragmentKind.Regex;
        source: string;
    }
    | {
        kind: DnrFragmentKind.Unsupported;
        reason: string;
    };

export const DnrFragments = {
    condition(patch: DnrCondition): DnrFragment {
        return {
            kind: DnrFragmentKind.Condition,
            patch,
        };
    },

    regex(source: string): DnrFragment {
        return {
            kind: DnrFragmentKind.Regex,
            source,
        };
    },

    unsupported(reason: string): DnrFragment {
        return {
            kind: DnrFragmentKind.Unsupported,
            reason,
        };
    },
};
