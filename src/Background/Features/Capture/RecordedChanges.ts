import { ChangeArea, type ValueChange } from "../../../Contracts/Rules/ValueChange";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { TimelineEntryDetail } from "../../../Contracts/Timeline/TimelineEntryDetail";

const ValueSeparator = "\n";

type DetailApplier = (detail: TimelineEntryDetail, change: ValueChange) => TimelineEntryDetail;

function isNamed(header: HeaderEntry, name: string): boolean {
    return header.name.toLowerCase() === name.toLowerCase();
}

function headersWith(headers: HeaderEntry[], change: ValueChange): HeaderEntry[] {
    const firstIndex = headers.findIndex(header => isNamed(header, change.name));
    const name = firstIndex === -1 ? change.name : headers[firstIndex]!.name;
    const replacements = change.after === null
        ? []
        : change.after
            .split(ValueSeparator)
            .map(value => ({
                name,
                value,
            }));
    const others = headers.filter(header => !isNamed(header, change.name));
    const position = firstIndex === -1 ? others.length : headers.slice(0, firstIndex).filter(header => !isNamed(header, change.name)).length;

    return [
        ...others.slice(0, position),
        ...replacements,
        ...others.slice(position),
    ];
}

const DetailAppliers: Partial<Record<ChangeArea, DetailApplier>> = {
    [ChangeArea.Url]: (detail, change) => change.after === null
        ? detail
        : {
            ...detail,
            summary: {
                ...detail.summary,
                url: change.after,
            },
        },
    [ChangeArea.RequestHeader]: (detail, change) => ({
        ...detail,
        requestHeaders: headersWith(detail.requestHeaders, change),
    }),
    [ChangeArea.RequestBody]: (detail, change) => ({
        ...detail,
        requestBody: change.after,
    }),
    [ChangeArea.Status]: (detail, change) => change.after === null
        ? detail
        : {
            ...detail,
            summary: {
                ...detail.summary,
                statusCode: Number(change.after),
            },
        },
    [ChangeArea.ResponseHeader]: (detail, change) => ({
        ...detail,
        responseHeaders: headersWith(detail.responseHeaders, change),
    }),
};

export const RecordedChanges = {
    applyTo(detail: TimelineEntryDetail): TimelineEntryDetail {
        return detail.changes.reduce(
            (current, change) => {
                const applier = DetailAppliers[change.area];

                return applier === undefined
                    ? current
                    : applier(current, change);
            },
            detail
        );
    },
};
