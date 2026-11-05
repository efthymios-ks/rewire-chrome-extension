import { CriterionOperatorIds } from "../../../Contracts/Rules/Criterion";
import { DomainList } from "../../Urls/DomainList";
import { DomainMatcher } from "../../Urls/DomainMatcher";
import { WildcardPattern } from "../../Urls/WildcardPattern";
import { RegexCache } from "./RegexCache";

export interface ICriterionOperator {
    readonly id: string;
    readonly label: string;
    readonly needsValue: boolean;
    test(values: string[], expected: string): boolean;
}

const ListSeparatorPattern = /[\s,]+/;
const RangePattern = /^(\d{3})\s*-\s*(\d{3})$/;
const ClassPattern = /^(\d)xx$/i;
const WindowPattern = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;
const MinutesPerHour = 60;
const StatusClassSize = 100;

function listOf(text: string): string[] {
    return text
        .split(ListSeparatorPattern)
        .map(item => item.trim().toLowerCase())
        .filter(item => item.length > 0);
}

function inRange(value: number, range: string): boolean {
    const trimmed = range.trim();
    const bounded = RangePattern.exec(trimmed);
    if (bounded !== null) {
        return value >= Number(bounded[1]) && value <= Number(bounded[2]);
    }

    const statusClass = ClassPattern.exec(trimmed);
    if (statusClass !== null) {
        const start = Number(statusClass[1]) * StatusClassSize;

        return value >= start && value < start + StatusClassSize;
    }

    return value === Number(trimmed);
}

function minutesOf(hours: string | undefined, minutes: string | undefined): number {
    return Number(hours) * MinutesPerHour + Number(minutes);
}

function inWindow(time: string, window: string): boolean {
    const match = WindowPattern.exec(window.trim());
    const [hours, minutes] = time.split(":");
    if (match === null) {
        return false;
    }

    const current = minutesOf(hours, minutes);
    const start = minutesOf(match[1], match[2]);
    const end = minutesOf(match[3], match[4]);

    return start <= end
        ? current >= start && current < end
        : current >= start || current < end;
}

export const CriterionOperators: ICriterionOperator[] = [
    {
        id: CriterionOperatorIds.Wildcard,
        label: "matches wildcard",
        needsValue: true,
        test: (values, expected) => values.some(value => WildcardPattern.matches(expected, value)),
    },
    {
        id: CriterionOperatorIds.Regex,
        label: "matches regex",
        needsValue: true,
        test: (values, expected) => values.some(value => RegexCache.test(expected, value)),
    },
    {
        id: CriterionOperatorIds.Domains,
        label: "is in domains",
        needsValue: true,
        test: (values, expected) => values.some(value => DomainMatcher.matchesAny(value, DomainList.parse(expected))),
    },
    {
        id: CriterionOperatorIds.OneOf,
        label: "is one of",
        needsValue: true,
        test: (values, expected) => values.some(value => listOf(expected).includes(value.toLowerCase())),
    },
    {
        id: CriterionOperatorIds.Exists,
        label: "exists",
        needsValue: false,
        test: values => values.length > 0,
    },
    {
        id: CriterionOperatorIds.Range,
        label: "is in range",
        needsValue: true,
        test: (values, expected) => values.some(value => expected
            .split(",")
            .some(range => inRange(Number(value), range))),
    },
    {
        id: CriterionOperatorIds.Percent,
        label: "falls in the first percent",
        needsValue: true,
        test: (values, expected) => values.some(value => Number(value) < Number(expected)),
    },
    {
        id: CriterionOperatorIds.Between,
        label: "is between",
        needsValue: true,
        test: (values, expected) => values.some(value => inWindow(value, expected)),
    },
];

export const CriterionOperatorRegistry = {
    get(id: string): ICriterionOperator | undefined {
        return CriterionOperators.find(operator => operator.id === id);
    },
};
