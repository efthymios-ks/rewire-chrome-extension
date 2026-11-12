import { JsonText } from "../../../Common/Json/JsonText";
import { JwtClaims } from "../../../Common/Jwt/JwtClaims";
import type { JwtObject } from "../../../Common/Jwt/JwtToken";
import { UtcText } from "../../Core/Formatting/UtcText";

export interface JwtField {
    name: string;
    value: string;
    children: JwtField[];
}

interface FieldFormat {
    matches(name: string, value: unknown, isTopLevel: boolean): boolean;
    build(name: string, value: unknown): JwtField;
}

const MillisecondsPerSecond = 1000;
const JsonTextStarts = [
    "{",
    "[",
];

function isContainer(value: unknown): value is object {
    return typeof value === "object" && value !== null;
}

function isEmptyContainer(value: object): boolean {
    return Object.keys(value).length === 0;
}

function parsedJsonOf(value: unknown): object | null {
    if (typeof value !== "string" || !JsonTextStarts.some(start => value.trimStart().startsWith(start))) {
        return null;
    }

    const parsed = JsonText.tryParse(value);

    return !parsed.hasErrors && isContainer(parsed.value) && !isEmptyContainer(parsed.value) ? parsed.value : null;
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
        value: "",
        children: childrenOf(container, false),
    };
}

const FieldFormats: FieldFormat[] = [
    {
        matches: (name, value, isTopLevel) => isTopLevel && JwtClaims.isTimeClaim(name) && typeof value === "number" && Number.isFinite(value),
        build: (name, value) => leaf(name, `${UtcText.of(new Date((value as number) * MillisecondsPerSecond))} (${value as number})`),
    },
    {
        matches: (_name, value) => parsedJsonOf(value) !== null,
        build: (name, value) => branch(name, parsedJsonOf(value)!),
    },
    {
        matches: (_name, value) => typeof value === "string",
        build: (name, value) => leaf(name, value as string),
    },
    {
        matches: (_name, value) => isContainer(value) && !isEmptyContainer(value),
        build: (name, value) => branch(name, value as object),
    },
];

function fieldOf(
    name: string,
    value: unknown,
    isTopLevel: boolean
): JwtField {
    const format = FieldFormats.find(candidate => candidate.matches(name, value, isTopLevel));

    return format === undefined ? leaf(name, JSON.stringify(value)) : format.build(name, value);
}

function childrenOf(container: object, isTopLevel: boolean): JwtField[] {
    return Object
        .entries(container)
        .map(([name, value]) => fieldOf(
            name,
            value,
            isTopLevel
        ));
}

export const JwtFields = {
    of(part: JwtObject): JwtField[] {
        return childrenOf(part, true);
    },
};
