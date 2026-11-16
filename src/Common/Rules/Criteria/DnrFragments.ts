import type { DnrCondition } from './DnrCondition';
import type { DnrFragment } from './DnrFragment';
import { DNR_FRAGMENT_KIND } from './DnrFragmentKind';

export const DnrFragments = {
    condition(patch: DnrCondition): DnrFragment {
        return {
            kind: DNR_FRAGMENT_KIND.Condition,
            patch,
        };
    },

    regex(source: string): DnrFragment {
        return {
            kind: DNR_FRAGMENT_KIND.Regex,
            source,
        };
    },

    unsupported(reason: string): DnrFragment {
        return {
            kind: DNR_FRAGMENT_KIND.Unsupported,
            reason,
        };
    },
};
