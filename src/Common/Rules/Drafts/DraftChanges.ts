import { ChangeArea, type ValueChange } from "../../../Contracts/Rules/ValueChange";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";
import type { RequestDraft, ResponseDraft, SyntheticResponse } from "./Drafts";

function headerMap(headers: HeaderEntry[]): Map<string, string> {
    const map = new Map<string, string>();
    headers.forEach(header => {
        const key = header.name.toLowerCase();
        const existing = map.get(key);
        map.set(key, existing === undefined ? header.value : `${existing}\n${header.value}`);
    });

    return map;
}

function headerChanges(
    area: ChangeArea,
    before: HeaderEntry[],
    after: HeaderEntry[]
): ValueChange[] {
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

function valueChange(
    area: ChangeArea,
    name: string,
    before: string | null,
    after: string | null
): ValueChange[] {
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
    return response === null ? null : `${response.status}`;
}

export const DraftChanges = {
    ofRequest(before: RequestDraft, after: RequestDraft): ValueChange[] {
        return [
            ...valueChange(
                ChangeArea.Url,
                "url",
                before.url,
                after.url
            ),
            ...headerChanges(
                ChangeArea.RequestHeader,
                before.headers,
                after.headers
            ),
            ...valueChange(
                ChangeArea.RequestBody,
                "body",
                before.body,
                after.body
            ),
            ...valueChange(
                ChangeArea.Outcome,
                "response",
                syntheticText(before.response),
                syntheticText(after.response)
            ),
        ];
    },

    ofResponse(before: ResponseDraft, after: ResponseDraft): ValueChange[] {
        return [
            ...valueChange(
                ChangeArea.Status,
                "status",
                String(before.status),
                String(after.status)
            ),
            ...headerChanges(
                ChangeArea.ResponseHeader,
                before.headers,
                after.headers
            ),
            ...valueChange(
                ChangeArea.ResponseBody,
                "body",
                before.body,
                after.body
            ),
        ];
    },
};
