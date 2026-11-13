import { SafeUrl } from "../../../Common/Urls/SafeUrl";
import type { EntryFrame } from "../../../Contracts/Timeline/EntryFrame";
import { FrameFilters } from "../../Core/FrameFilters";

export interface PageFrame {
    id: string;
    url: string;
    label: string;
}

type FramePredicate = (frame: EntryFrame | null) => boolean;

const FixedFilters: Record<string, FramePredicate> = {
    [FrameFilters.All]: () => true,
    [FrameFilters.Top]: frame => frame === null || frame.isTop,
};

function hostOf(url: string): string {
    return SafeUrl.parse(url)?.hostname || url;
}

export const PageFrames = {
    of(frames: (EntryFrame | null)[]): PageFrame[] {
        const urls = new Map<string, string>();
        frames
            .filter((frame): frame is EntryFrame => frame !== null && !frame.isTop)
            .forEach(frame => urls.set(frame.id, frame.url));

        const hostCounts = new Map<string, number>();

        return [...urls.entries()].map(([id, url]) => {
            const host = hostOf(url);
            const count = (hostCounts.get(host) ?? 0) + 1;
            hostCounts.set(host, count);

            return {
                id,
                url,
                label: count === 1 ? host : `${host} (${count})`,
            };
        });
    },

    accepts(frame: EntryFrame | null, filter: string): boolean {
        const fixed = FixedFilters[filter];
        if (fixed !== undefined) {
            return fixed(frame);
        }

        return frame?.id === filter;
    },

    isFixed(filter: string): boolean {
        return FixedFilters[filter] !== undefined;
    },
};
