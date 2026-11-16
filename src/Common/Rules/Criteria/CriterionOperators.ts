import { CRITERION_OPERATOR_IDS } from '../../../Contracts/Rules/CriterionOperatorIds';
import { RegexCache } from '../../Regex/RegexCache';
import { DomainList } from '../../Urls/DomainList';
import { DomainMatcher } from '../../Urls/DomainMatcher';
import { WildcardPattern } from '../../Urls/WildcardPattern';
import { criterionValuesOf } from './criterionValuesOf';

export interface OperatorTestOptions {
    values: string[];
    expected: string;
    isCaseInsensitive?: boolean;
}

export interface CriterionOperator {
    readonly id: string;
    readonly label: string;
    readonly needsValue: boolean;
    test(options: OperatorTestOptions): boolean;
}

const RANGE_PATTERN = /^(\d{3})\s*-\s*(\d{3})$/;
const CLASS_PATTERN = /^(\d)xx$/i;
const WINDOW_PATTERN = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;
const MINUTES_PER_HOUR = 60;
const STATUS_CLASS_SIZE = 100;

function inRange(value: number, range: string): boolean {
    const trimmed = range.trim();
    const bounded = RANGE_PATTERN.exec(trimmed);
    if (bounded != null) {
        return value >= Number(bounded[1]) && value <= Number(bounded[2]);
    }

    const statusClass = CLASS_PATTERN.exec(trimmed);
    if (statusClass != null) {
        const start = Number(statusClass[1]) * STATUS_CLASS_SIZE;

        return value >= start && value < start + STATUS_CLASS_SIZE;
    }

    return value === Number(trimmed);
}

function minutesOf(hours: string | undefined, minutes: string | undefined): number {
    return Number(hours) * MINUTES_PER_HOUR + Number(minutes);
}

function inWindow(time: string, window: string): boolean {
    const match = WINDOW_PATTERN.exec(window.trim());
    const [hours, minutes] = time.split(':');
    if (match == null) {
        return false;
    }

    const current = minutesOf(hours, minutes);
    const start = minutesOf(match[1], match[2]);
    const end = minutesOf(match[3], match[4]);

    return start <= end
        ? current >= start && current < end
        : current >= start || current < end;
}

export const CRITERION_OPERATORS: CriterionOperator[] = [
    {
        id: CRITERION_OPERATOR_IDS.Wildcard,
        label: 'matches wildcard',
        needsValue: true,
        test: ({ values, expected, isCaseInsensitive }) => values.some(value => isCaseInsensitive === true
            ? WildcardPattern.matchesIgnoringCase(expected, value)
            : WildcardPattern.matches(expected, value)),
    },
    {
        id: CRITERION_OPERATOR_IDS.Regex,
        label: 'matches regex',
        needsValue: true,
        test: ({ values, expected, isCaseInsensitive }) => values.some(value => isCaseInsensitive === true
            ? RegexCache.testIgnoringCase(expected, value)
            : RegexCache.test(expected, value)),
    },
    {
        id: CRITERION_OPERATOR_IDS.Domains,
        label: 'is in domains',
        needsValue: true,
        test: ({ values, expected }) => values.some(value => DomainMatcher.matchesAny(
            /* host: */ value,
            /* domains: */ DomainList.parse(expected),
        )),
    },
    {
        id: CRITERION_OPERATOR_IDS.OneOf,
        label: 'is one of',
        needsValue: true,
        test: ({ values, expected }) => {
            const expectedValues = criterionValuesOf(expected);

            return values.some(value => expectedValues.includes(value.toLowerCase()));
        },
    },
    {
        id: CRITERION_OPERATOR_IDS.Exists,
        label: 'exists',
        needsValue: false,
        test: ({ values }) => values.length > 0,
    },
    {
        id: CRITERION_OPERATOR_IDS.Range,
        label: 'is in range',
        needsValue: true,
        test: ({ values, expected }) => values.some(value => expected
            .split(',')
            .some(range => inRange(
                /* value: */ Number(value),
                /* range: */ range,
            ))),
    },
    {
        id: CRITERION_OPERATOR_IDS.Percent,
        label: 'falls in the first percent',
        needsValue: true,
        test: ({ values, expected }) => values.some(value => Number(value) < Number(expected)),
    },
    {
        id: CRITERION_OPERATOR_IDS.Between,
        label: 'is between',
        needsValue: true,
        test: ({ values, expected }) => values.some(value => inWindow(value, expected)),
    },
];
