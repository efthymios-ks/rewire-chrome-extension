import { CountText } from '../../Core/Formatting/CountText';
import type { PanelState } from '../../Core/PanelState';
import { SearchFilter } from './SearchFilter';
import { VisibleEntries } from './VisibleEntries';

export const SearchStatusText = {
    of(state: PanelState): string {
        const search = state.search;
        if (search.error != null) {
            return search.error;
        }

        if (!SearchFilter.isActive(search)) {
            return '';
        }

        const count = VisibleEntries.of(state).length;
        if (count === 0) {
            return 'No matches';
        }

        return CountText.of({
            count,
            singular: 'match',
            plural: 'matches',
        });
    },
};
