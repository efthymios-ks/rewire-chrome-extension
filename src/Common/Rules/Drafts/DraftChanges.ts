import { CHANGE_AREA, type ChangeArea } from '../../../Contracts/Rules/ChangeArea';
import type { ValueChange } from '../../../Contracts/Rules/ValueChange';
import type { HeaderEntry } from '../../../Contracts/Timeline/HeaderEntry';
import type { RequestDraft } from './RequestDraft';
import type { ResponseDraft } from './ResponseDraft';
import type { SyntheticResponse } from './SyntheticResponse';

function headerMap(headers: HeaderEntry[]): Map<string, string> {
    const map = new Map<string, string>();
    headers.forEach(header => {
        const key = header.name.toLowerCase();
        const existing = map.get(key);
        map.set(key, existing == null ? header.value : `${existing}\n${header.value}`);
    });

    return map;
}

interface HeaderChangesOptions {
    area: ChangeArea;
    before: HeaderEntry[];
    after: HeaderEntry[];
}

function headerChanges({ area, before, after }: HeaderChangesOptions): ValueChange[] {
    const beforeMap = headerMap(before);
    const afterMap = headerMap(after);
    const names = new Set([
        ...beforeMap.keys(),
        ...afterMap.keys(),
    ]);

    return [...names]
        .filter(name => beforeMap.get(name) !== afterMap.get(name))
        .map(name => ({
            area,
            name,
            before: beforeMap.get(name) ?? null,
            after: afterMap.get(name) ?? null,
        }));
}

interface ValueChangeOptions {
    area: ChangeArea;
    name: string;
    before: string | null;
    after: string | null;
}

function valueChange({ area, name, before, after }: ValueChangeOptions): ValueChange[] {
    if (before === after) {
        return [];
    }

    return [
        {
            area,
            name,
            before,
            after,
        },
    ];
}

function syntheticText(response: SyntheticResponse | null): string | null {
    return response == null ? null : `${response.status}`;
}

export const DraftChanges = {
    ofRequest(before: RequestDraft, after: RequestDraft): ValueChange[] {
        return [
            ...valueChange({ area: CHANGE_AREA.Url, name: 'url', before: before.url, after: after.url }),
            ...headerChanges({
                area: CHANGE_AREA.RequestHeader,
                before: before.headers,
                after: after.headers,
            }),
            ...valueChange({
                area: CHANGE_AREA.RequestBody,
                name: 'body',
                before: before.body,
                after: after.body,
            }),
            ...valueChange({
                area: CHANGE_AREA.Outcome,
                name: 'response',
                before: syntheticText(before.response),
                after: syntheticText(after.response),
            }),
        ];
    },

    ofResponse(before: ResponseDraft, after: ResponseDraft): ValueChange[] {
        return [
            ...valueChange({
                area: CHANGE_AREA.Status,
                name: 'status',
                before: String(before.status),
                after: String(after.status),
            }),
            ...headerChanges({
                area: CHANGE_AREA.ResponseHeader,
                before: before.headers,
                after: after.headers,
            }),
            ...valueChange({
                area: CHANGE_AREA.ResponseBody,
                name: 'body',
                before: before.body,
                after: after.body,
            }),
        ];
    },
};
