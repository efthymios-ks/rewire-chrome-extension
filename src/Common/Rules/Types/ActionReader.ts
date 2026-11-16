import type { RuleAction } from '../../../Contracts/Rules/RuleAction';
import { LATENCY_LIMITS } from '../../../Contracts/Settings/LatencyLimits';
import { RawRecords } from '../../Objects/RawRecords';
import { CommonFields } from './CommonFields';

type RawRecord = Record<string, unknown>;

export interface TextOptions {
    raw: RuleAction;
    key: string;
    fallback?: string;
}

export interface NumberOptions {
    raw: RuleAction;
    key: string;
    fallback: number;
}

export interface BoolOptions {
    raw: RuleAction;
    key: string;
    fallback: boolean;
}

export interface RecordsOptions<TItem> {
    raw: RuleAction;
    key: string;
    map: (item: RawRecord) => TItem;
}

export const ActionReader = {
    text({ raw, key, fallback = '' }: TextOptions): string {
        const value = raw[key];

        return typeof value === 'string' ? value : fallback;
    },

    number({ raw, key, fallback }: NumberOptions): number {
        const value = raw[key];

        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    },

    nullableNumber(raw: RuleAction, key: string): number | null {
        const value = raw[key];

        return typeof value === 'number' && Number.isFinite(value) ? value : null;
    },

    bool({ raw, key, fallback }: BoolOptions): boolean {
        const value = raw[key];

        return typeof value === 'boolean' ? value : fallback;
    },

    strings(raw: RuleAction, key: string): string[] {
        const value = raw[key];
        if (!Array.isArray(value)) {
            return [];
        }

        return value.filter((item): item is string => typeof item === 'string');
    },

    records<TItem>({ raw, key, map }: RecordsOptions<TItem>): TItem[] {
        const value = raw[key];
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .filter(RawRecords.is)
            .map(map);
    },

    delay(raw: RuleAction): number {
        const delay = ActionReader.number({ raw, key: CommonFields.DelayKey, fallback: 0 });

        return Math.min(
            /* values: */ Math.max(delay, LATENCY_LIMITS.MinDelayInMilliseconds),
            /* values: */ LATENCY_LIMITS.MaxDelayInMilliseconds,
        );
    },
};
