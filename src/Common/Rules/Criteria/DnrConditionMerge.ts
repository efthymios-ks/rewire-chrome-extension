import { Result } from '../../Results/Result';
import { DomainMatcher } from '../../Urls/DomainMatcher';
import type { DnrCondition } from './DnrCondition';

const ONE_FILTER_MESSAGE = 'With more than one URL, path, extension, host pattern or query condition the rule works on the inspected tab only.';
const NEVER_MATCHES_MESSAGE = 'These conditions can never match the same request, so the rule never applies.';

const FILTER_KEYS = [
    'urlFilter',
    'regexFilter',
];

type ConditionRecord = Record<string, unknown>;

type ListCombiner = (current: string[], next: string[]) => string[];

interface ListMerger {
    keys: string[];
    combine: ListCombiner;
}

interface ListPair {
    include: string;
    exclude: string;
    subtract(included: string[], excluded: string[]): string[];
    keepsExclusions: boolean;
}

function unique(items: string[]): string[] {
    return [...new Set(items)];
}

function narrowerDomainOf(first: string, second: string): string[] {
    if (DomainMatcher.matches(first, second)) {
        return [first];
    }

    if (DomainMatcher.matches(second, first)) {
        return [second];
    }

    return [];
}

const LIST_MERGERS: ListMerger[] = [
    {
        keys: [
            'requestDomains',
            'initiatorDomains',
        ],
        combine: (current, next) => unique(current.flatMap(first => next.flatMap(second => narrowerDomainOf(
            /* first: */ first,
            /* second: */ second,
        )))),
    },
    {
        keys: [
            'requestMethods',
            'resourceTypes',
        ],
        combine: (current, next) => current.filter(item => next.includes(item)),
    },
    {
        keys: [
            'excludedRequestDomains',
            'excludedInitiatorDomains',
            'excludedRequestMethods',
            'excludedResourceTypes',
        ],
        combine: (current, next) => unique([
            ...current,
            ...next,
        ]),
    },
];

function withoutItems(included: string[], excluded: string[]): string[] {
    return included.filter(item => !excluded.includes(item));
}

function withoutDomains(included: string[], excluded: string[]): string[] {
    return included.filter(domain => !DomainMatcher.matchesAny(domain, excluded));
}

// Domain exclusions stay because they can still carve a subdomain out of an included domain.
const LIST_PAIRS: ListPair[] = [
    {
        include: 'requestMethods',
        exclude: 'excludedRequestMethods',
        subtract: withoutItems,
        keepsExclusions: false,
    },
    {
        include: 'resourceTypes',
        exclude: 'excludedResourceTypes',
        subtract: withoutItems,
        keepsExclusions: false,
    },
    {
        include: 'requestDomains',
        exclude: 'excludedRequestDomains',
        subtract: withoutDomains,
        keepsExclusions: true,
    },
    {
        include: 'initiatorDomains',
        exclude: 'excludedInitiatorDomains',
        subtract: withoutDomains,
        keepsExclusions: true,
    },
];

function listOf(value: unknown): string[] | null {
    return Array.isArray(value) ? value as string[] : null;
}

function hasFilter(condition: ConditionRecord): boolean {
    return FILTER_KEYS.some(key => condition[key] != null);
}

function settle(condition: ConditionRecord): Result<DnrCondition> {
    const settled: ConditionRecord = { ...condition };
    for (const pair of LIST_PAIRS) {
        const included = listOf(settled[pair.include]);
        const excluded = listOf(settled[pair.exclude]);
        if (excluded != null && excluded.length === 0) {
            delete settled[pair.exclude];
        }

        if (included == null) {
            continue;
        }

        const remaining = excluded == null ? included : pair.subtract(included, excluded);
        if (remaining.length === 0) {
            return Result.fail(NEVER_MATCHES_MESSAGE);
        }

        settled[pair.include] = remaining;
        if (excluded != null && !pair.keepsExclusions) {
            delete settled[pair.exclude];
        }
    }

    return Result.ok(settled as DnrCondition);
}

export const DnrConditionMerge = {
    merge(condition: DnrCondition, patch: DnrCondition): Result<DnrCondition> {
        const current = condition as ConditionRecord;
        const next = patch as ConditionRecord;
        if (hasFilter(current) && hasFilter(next)) {
            return Result.fail(ONE_FILTER_MESSAGE);
        }

        const merged: ConditionRecord = {
            ...current,
            ...next,
        };
        for (const merger of LIST_MERGERS) {
            for (const key of merger.keys) {
                const currentList = listOf(current[key]);
                const nextList = listOf(next[key]);
                if (currentList != null && nextList != null) {
                    merged[key] = merger.combine(currentList, nextList);
                }
            }
        }

        return settle(merged);
    },
};
