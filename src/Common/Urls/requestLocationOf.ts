import type { TimelineEntrySummary } from '../../Contracts/Timeline/TimelineEntrySummary';
import { EndpointKey } from './EndpointKey';
import { SafeUrl } from './SafeUrl';

export type RequestLocation = Pick<TimelineEntrySummary, 'method' | 'url' | 'host' | 'path' | 'endpointKey'>;

export function requestLocationOf(method: string, url: string): RequestLocation {
    const parsed = SafeUrl.parse(url);

    return {
        method,
        url,
        host: parsed?.hostname ?? '',
        path: parsed == null ? url : `${parsed.pathname}${parsed.search}`,
        endpointKey: EndpointKey.create(method, url),
    };
}
