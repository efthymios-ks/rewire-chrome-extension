import type { Protocol } from 'devtools-protocol';
import { ResourceScope } from '../../../Common/Rules/Criteria/ResourceScope';
import type { PipelineEntry } from '../../../Common/Rules/Engine/PipelineEntry';

const ANY_URL = '*';

type FetchStage = Protocol.Fetch.RequestStage;

function scopeOf(entries: PipelineEntry[]): string[] | null {
    const types = new Set<string>();
    for (const entry of entries) {
        const entryTypes = ResourceScope.debuggerTypesOf(entry.plan.rule.criteria);
        if (entryTypes == null) {
            return null;
        }

        entryTypes.forEach(type => types.add(type));
    }

    return [...types];
}

function patternsOf(entries: PipelineEntry[], requestStage: FetchStage): Protocol.Fetch.RequestPattern[] {
    if (entries.length === 0) {
        return [];
    }

    const types = scopeOf(entries);
    if (types == null) {
        return [
            {
                urlPattern: ANY_URL,
                requestStage,
            },
        ];
    }

    return types.map(type => ({
        urlPattern: ANY_URL,
        resourceType: type as Protocol.Network.ResourceType,
        requestStage,
    }));
}

export const FetchPatternBuilder = {
    build(entries: PipelineEntry[]): Protocol.Fetch.RequestPattern[] {
        return [
            ...patternsOf(entries, 'Request'),
            ...patternsOf(
                /* entries: */ entries.filter(entry => entry.runsResponse),
                /* requestStage: */ 'Response',
            ),
        ];
    },
};
