import type { DnrCondition } from './DnrCondition';
import type { DNR_FRAGMENT_KIND } from './DnrFragmentKind';

export type DnrFragment =
    | {
        kind: typeof DNR_FRAGMENT_KIND.Condition;
        patch: DnrCondition;
    }
    | {
        kind: typeof DNR_FRAGMENT_KIND.Regex;
        source: string;
    }
    | {
        kind: typeof DNR_FRAGMENT_KIND.Unsupported;
        reason: string;
    };
