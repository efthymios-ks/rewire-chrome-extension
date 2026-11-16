import { JsonText } from '../../../Common/Json/JsonText';
import { JwtClaims } from '../../../Common/Jwt/JwtClaims';
import type { JwtObject } from '../../../Common/Jwt/JwtObject';
import { UtcText } from '../../Core/Formatting/UtcText';

export interface JwtField {
    name: string;
    value: string;
    children: JwtField[];
}

interface MatchesOptions {
    name: string;
    value: unknown;
    isTopLevel: boolean;
}

interface FieldFormat {
    matches(options: MatchesOptions): boolean;
    build(name: string, value: unknown): JwtField;
}

const MILLISECONDS_PER_SECOND = 1000;
const JSON_TEXT_STARTS = [
    '{',
    '[',
];

function isContainer(value: unknown): value is object {
    return typeof value === 'object' && value != null;
}

function isEmptyContainer(value: object): boolean {
    return Object.keys(value).length === 0;
}

function parsedJsonOf(value: unknown): object | null {
    if (typeof value !== 'string' || !JSON_TEXT_STARTS.some(start => value.trimStart().startsWith(start))) {
        return null;
    }

    const parsed = JsonText.tryParse(value);

    if (
        parsed.hasErrors
        || !isContainer(parsed.value)
        || isEmptyContainer(parsed.value)
    ) {
        return null;
    }

    return parsed.value;
}

function leaf(name: string, value: string): JwtField {
    return {
        name,
        value,
        children: [],
    };
}

function branch(name: string, container: object): JwtField {
    return {
        name,
        value: '',
        children: childrenOf(container, false),
    };
}

const FIELD_FORMATS: FieldFormat[] = [
    {
        matches: ({ name, value, isTopLevel }) => isTopLevel
            && JwtClaims.isTimeClaim(name)
            && typeof value === 'number'
            && Number.isFinite(value),
        build: (name, value) => {
            const seconds = value as number;

            return leaf(name, `${UtcText.of(new Date(seconds * MILLISECONDS_PER_SECOND))} (${seconds})`);
        },
    },
    {
        matches: ({ value }) => parsedJsonOf(value) != null,
        build: (name, value) => branch(
            /* name: */ name,
            /* container: */ parsedJsonOf(value)!,
        ),
    },
    {
        matches: ({ value }) => typeof value === 'string',
        build: (name, value) => leaf(name, value as string),
    },
    {
        matches: ({ value }) => isContainer(value) && !isEmptyContainer(value),
        build: (name, value) => branch(name, value as object),
    },
];

interface FieldOfOptions {
    name: string;
    value: unknown;
    isTopLevel: boolean;
}

function fieldOf({ name, value, isTopLevel }: FieldOfOptions): JwtField {
    const format = FIELD_FORMATS.find(candidate => candidate.matches({ name, value, isTopLevel }));

    return format == null ? leaf(
        /* name: */ name,
        /* value: */ JSON.stringify(value),
    ) : format.build(name, value);
}

function childrenOf(container: object, isTopLevel: boolean): JwtField[] {
    return Object
        .entries(container)
        .map(([name, value]) => fieldOf({ name, value, isTopLevel }));
}

export const JwtFields = {
    of(part: JwtObject): JwtField[] {
        return childrenOf(part, true);
    },
};
