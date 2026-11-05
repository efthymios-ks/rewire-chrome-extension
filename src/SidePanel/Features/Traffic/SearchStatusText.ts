import type { TrafficSearchState } from "../../Core/TrafficSearchState";

export const SearchStatusText = {
    of(state: TrafficSearchState): string {
        if (state.error !== null) {
            return state.error;
        }

        if (state.query.text === "") {
            return "";
        }

        if (state.matches.length === 0) {
            return "No matches";
        }

        if (state.activeIndex < 0) {
            return `${state.matches.length} matches`;
        }

        return `${state.activeIndex + 1} of ${state.matches.length}`;
    },
};
