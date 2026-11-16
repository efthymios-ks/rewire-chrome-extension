import { CHANGE_AREA, type ChangeArea } from '../../../Contracts/Rules/ChangeArea';
import type { ValueChange } from '../../../Contracts/Rules/ValueChange';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { TimelineEntryDetail } from '../../../Contracts/Timeline/TimelineEntryDetail';

const VALUE_SEPARATOR = '\n';

type DetailApplier = (detail: TimelineEntryDetail, change: ValueChange) => TimelineEntryDetail;

function isNamed(header: HeaderEntry, name: string): boolean {
    return header.name.toLowerCase() === name.toLowerCase();
}

function headersWith(headers: HeaderEntry[], change: ValueChange): HeaderEntry[] {
    const firstIndex = headers.findIndex(header => isNamed(header, change.name));
    const name = headers[firstIndex]?.name ?? change.name;
    const replacements = change.after == null
        ? []
        : change.after
            .split(VALUE_SEPARATOR)
            .map(value => ({
                name,
                value,
            }));
    const others = headers.filter(header => !isNamed(header, change.name));
    const position = firstIndex === -1
        ? others.length
        : headers
            .slice(0, firstIndex)
            .filter(header => !isNamed(header, change.name))
            .length;

    return [
        ...others.slice(0, position),
        ...replacements,
        ...others.slice(position),
    ];
}

const DETAIL_APPLIERS: Partial<Record<ChangeArea, DetailApplier>> = {
    [CHANGE_AREA.Url]: (detail, change) => change.after == null
        ? detail
        : {
            ...detail,
            summary: {
                ...detail.summary,
                url: change.after,
            },
        },
    [CHANGE_AREA.RequestHeader]: (detail, change) => ({
        ...detail,
        requestHeaders: headersWith(detail.requestHeaders, change),
    }),
    [CHANGE_AREA.RequestBody]: (detail, change) => ({
        ...detail,
        requestBody: change.after,
        requestBodyNote: null,
        requestBodyBase64: null,
        requestBodyByteSize: null,
    }),
    [CHANGE_AREA.Status]: (detail, change) => change.after == null
        ? detail
        : {
            ...detail,
            summary: {
                ...detail.summary,
                statusCode: Number(change.after),
            },
        },
    [CHANGE_AREA.ResponseHeader]: (detail, change) => ({
        ...detail,
        responseHeaders: headersWith(detail.responseHeaders, change),
    }),
};

export const RecordedChanges = {
    applyTo(detail: TimelineEntryDetail): TimelineEntryDetail {
        return detail.changes.reduce(
            /* callbackfn: */ (current, change) => {
                const applier = DETAIL_APPLIERS[change.area];

                return applier == null
                    ? current
                    : applier(current, change);
            },
            /* initialValue: */ detail,
        );
    },
};
