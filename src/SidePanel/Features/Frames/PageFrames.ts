import { OwnEntry } from '../../../Common/Objects/OwnEntry';
import { SafeUrl } from '../../../Common/Urls/SafeUrl';
import type { EntryFrame } from '../../../Contracts/Timeline/EntryFrame';
import { FRAME_FILTERS } from '../../Core/FrameFilters';
import type { PageFrame } from './PageFrame';

type FramePredicate = (frame: EntryFrame | null) => boolean;

const FIXED_FILTERS: Record<string, FramePredicate> = {
    [FRAME_FILTERS.All]: () => true,
    [FRAME_FILTERS.Top]: frame => frame == null || frame.isTop,
};

const HTTP_PROTOCOLS: readonly string[] = Object.freeze([
    'http:',
    'https:',
]);
const LABEL_SEPARATOR = ' · ';
const PATH_SEPARATOR = '/';
const NOT_FOUND = -1;
const MAX_PATH_LENGTH = 24;
const SHORTENED_PATH_PREFIX = '/…';

function hostOf(url: string): string {
    const hostname = SafeUrl.parse(url)?.hostname ?? '';

    return hostname === '' ? url : hostname;
}

// Iframes on one site differ at the end of their paths, so that end is what stays.
function shortPathOf(path: string): string {
    if (path.length <= MAX_PATH_LENGTH) {
        return path;
    }

    const tail = path.slice(SHORTENED_PATH_PREFIX.length - MAX_PATH_LENGTH);
    const segmentStart = tail.indexOf(PATH_SEPARATOR);
    const hasWholeSegments = segmentStart !== NOT_FOUND && segmentStart < tail.length - 1;

    return `${SHORTENED_PATH_PREFIX}${hasWholeSegments ? tail.slice(segmentStart) : tail}`;
}

function labelOf(url: string): string {
    const parsed = SafeUrl.parse(url);
    if (parsed == null || !HTTP_PROTOCOLS.includes(parsed.protocol)) {
        return hostOf(url);
    }

    if (parsed.pathname === PATH_SEPARATOR) {
        return parsed.host;
    }

    return `${parsed.host}${LABEL_SEPARATOR}${shortPathOf(parsed.pathname)}`;
}

export const PageFrames = {
    of(frames: (EntryFrame | null)[]): PageFrame[] {
        const urls = new Map<string, string>();
        frames
            .filter((frame): frame is EntryFrame => frame != null && !frame.isTop)
            .forEach(frame => urls.set(frame.id, frame.url));

        const labelCounts = new Map<string, number>();

        return [...urls.entries()].map(([id, url]) => {
            const label = labelOf(url);
            const count = (labelCounts.get(label) ?? 0) + 1;
            labelCounts.set(label, count);

            return {
                id,
                url,
                label: count === 1 ? label : `${label} (${count})`,
            };
        });
    },

    accepts(frame: EntryFrame | null, filter: string): boolean {
        const fixed = OwnEntry.of(FIXED_FILTERS, filter);
        if (fixed != null) {
            return fixed(frame);
        }

        return frame?.id === filter;
    },

    isFixed(filter: string): boolean {
        return OwnEntry.of(FIXED_FILTERS, filter) != null;
    },
};
