import type { RuleAction } from "../../../Contracts/Rules/Rule";
import { LatencyLimits } from "../../../Contracts/Settings/LatencyLimits";
import { CommonFields } from "./FieldSpec";

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const ActionReader = {
    text(
        raw: RuleAction,
        key: string,
        fallback: string = ""
    ): string {
        const value = raw[key];

        return typeof value === "string" ? value : fallback;
    },

    number(
        raw: RuleAction,
        key: string,
        fallback: number
    ): number {
        const value = raw[key];

        return typeof value === "number" && Number.isFinite(value) ? value : fallback;
    },

    nullableNumber(raw: RuleAction, key: string): number | null {
        const value = raw[key];

        return typeof value === "number" && Number.isFinite(value) ? value : null;
    },

    bool(
        raw: RuleAction,
        key: string,
        fallback: boolean
    ): boolean {
        const value = raw[key];

        return typeof value === "boolean" ? value : fallback;
    },

    strings(raw: RuleAction, key: string): string[] {
        const value = raw[key];
        if (!Array.isArray(value)) {
            return [];
        }

        return value.filter((item): item is string => typeof item === "string");
    },

    records<TItem>(
        raw: RuleAction,
        key: string,
        map: (item: RawRecord) => TItem
    ): TItem[] {
        const value = raw[key];
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .filter(isRecord)
            .map(map);
    },

    field(
        item: RawRecord,
        key: string,
        fallback: string = ""
    ): string {
        const value = item[key];

        return typeof value === "string" ? value : fallback;
    },

    delay(raw: RuleAction): number {
        const delay = ActionReader.number(
            raw,
            CommonFields.DelayKey,
            0
        );

        return Math.min(Math.max(delay, LatencyLimits.MinDelayInMilliseconds), LatencyLimits.MaxDelayInMilliseconds);
    },
};
