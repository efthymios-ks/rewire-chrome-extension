import { Result } from "../Results/Result";
import type { XmlNode } from "./XmlNode";
import { XmlParser } from "./XmlParser";

type Axis = "child" | "descendant";
type NodeTest = {
    kind: "element";
    name: string;
} | {
    kind: "text";
} | {
    kind: "attribute";
    name: string;
};

interface Predicate {
    kind: "index" | "attribute";
    index?: number;
    attribute?: string;
    value?: string;
}

interface Step {
    axis: Axis;
    test: NodeTest;
    predicates: Predicate[];
}

const Wildcard = "*";
const TextCall = "text()";
const AttributeMarker = "@";
const StepSeparator = "/";
const DescendantSeparator = "//";
const OpenBracket = "[";
const CloseBracket = "]";
const IndexPattern = /^-?\d+$/;
const AttributePredicatePattern = /^@([^\s=]+)\s*=\s*('([^']*)'|"([^"]*)")$/;
const DocumentNodeName = "";

function parsePredicate(inner: string): Result<Predicate> {
    const trimmed = inner.trim();
    if (IndexPattern.test(trimmed)) {
        return Result.ok({
            kind: "index",
            index: Number(trimmed),
        });
    }

    const match = AttributePredicatePattern.exec(trimmed);
    if (match === null) {
        return Result.fail(`Only [index] and [@attr='value'] are supported; got '[${inner}]'.`);
    }

    return Result.ok({
        kind: "attribute",
        attribute: match[1]!,
        value: match[3] ?? match[4] ?? "",
    });
}

function parseStep(raw: string, axis: Axis): Result<Step> {
    const predicates: Predicate[] = [];
    let head = raw;
    while (true) {
        const open = head.indexOf(OpenBracket);
        if (open === -1) {
            break;
        }

        const close = head.indexOf(CloseBracket, open);
        if (close === -1) {
            return Result.fail(`Unclosed '[' in step '${raw}'.`);
        }

        const predicate = parsePredicate(head.slice(open + 1, close));
        if (predicate.hasErrors) {
            return predicate;
        }

        predicates.push(predicate.value);
        head = `${head.slice(0, open)}${head.slice(close + 1)}`;
    }

    const name = head.trim();
    if (name === TextCall) {
        return Result.ok({
            axis,
            test: {
                kind: "text",
            },
            predicates,
        });
    }

    if (name.startsWith(AttributeMarker)) {
        const attributeName = name.slice(1);
        if (attributeName === "") {
            return Result.fail("Attribute step without a name.");
        }

        return Result.ok({
            axis,
            test: {
                kind: "attribute",
                name: attributeName,
            },
            predicates,
        });
    }

    if (name === "") {
        return Result.fail(`Empty step in '${raw}'.`);
    }

    return Result.ok({
        axis,
        test: {
            kind: "element",
            name,
        },
        predicates,
    });
}

function parsePath(path: string): Result<Step[]> {
    const trimmed = path.trim();
    if (!trimmed.startsWith(StepSeparator)) {
        return Result.fail("An XPath expression starts with '/' or '//'.");
    }

    const steps: Step[] = [];
    let position = 0;
    while (position < trimmed.length) {
        if (trimmed.charAt(position) !== StepSeparator) {
            return Result.fail(`Unexpected '${trimmed.charAt(position)}' at position ${position} of '${trimmed}'.`);
        }

        const isDescendant = trimmed.startsWith(DescendantSeparator, position);
        const axis: Axis = isDescendant ? "descendant" : "child";
        position += isDescendant ? DescendantSeparator.length : StepSeparator.length;

        let end = position;
        let inBrackets = false;
        while (end < trimmed.length && (inBrackets || trimmed.charAt(end) !== StepSeparator)) {
            if (trimmed.charAt(end) === OpenBracket) {
                inBrackets = true;
            } else if (trimmed.charAt(end) === CloseBracket) {
                inBrackets = false;
            }

            end++;
        }

        const raw = trimmed.slice(position, end);
        if (raw === "") {
            return Result.fail(`Empty step at position ${position} of '${trimmed}'.`);
        }

        const step = parseStep(raw, axis);
        if (step.hasErrors) {
            return step;
        }

        steps.push(step.value);
        position = end;
    }

    if (steps.length === 0) {
        return Result.fail("Empty XPath expression.");
    }

    return Result.ok(steps);
}

function childElements(node: XmlNode): XmlNode[] {
    return node.children;
}

function descendants(node: XmlNode): XmlNode[] {
    const list: XmlNode[] = [];
    for (const child of node.children) {
        list.push(child);
        list.push(...descendants(child));
    }

    return list;
}

function matchesElement(node: XmlNode, name: string): boolean {
    return name === Wildcard || node.name === name;
}

function elementContext(nodes: XmlNode[], step: Step): XmlNode[] {
    const base = step.axis === "descendant"
        ? nodes.flatMap(node => descendants(node))
        : nodes.flatMap(node => childElements(node));
    const test = step.test;
    const matched = test.kind === "element"
        ? base.filter(node => matchesElement(node, test.name))
        : base;

    return applyElementPredicates(matched, step.predicates);
}

function applyElementPredicates(nodes: XmlNode[], predicates: Predicate[]): XmlNode[] {
    return predicates.reduce((current, predicate) => {
        if (predicate.kind === "index") {
            const index = predicate.index!;
            const position = index > 0 ? index - 1 : current.length + index;
            const picked = current[position];

            return picked === undefined ? [] : [picked];
        }

        return current.filter(node => node.attributes[predicate.attribute!] === predicate.value);
    }, nodes);
}

function selfAndDescendants(nodes: XmlNode[], step: Step): XmlNode[] {
    return step.axis === "descendant"
        ? nodes.flatMap(node => [
            node,
            ...descendants(node),
        ])
        : nodes;
}

function evaluate(root: XmlNode, steps: Step[]): string | null {
    let nodes: XmlNode[] = [
        {
            name: DocumentNodeName,
            attributes: {},
            text: "",
            children: [root],
        },
    ];

    for (const step of steps) {
        const test = step.test;
        if (test.kind === "attribute") {
            const context = applyElementPredicates(selfAndDescendants(nodes, step), step.predicates);
            const values = context
                .map(node => node.attributes[test.name])
                .filter((value): value is string => value !== undefined);

            return values[0] ?? null;
        }

        if (test.kind === "text") {
            const context = applyElementPredicates(selfAndDescendants(nodes, step), step.predicates);

            return context.length === 0 ? null : XmlParser.textOf(context[0]!);
        }

        nodes = elementContext(nodes, step);
    }

    return nodes.length === 0 ? null : XmlParser.textOf(nodes[0]!);
}

export const XPath = {
    validate(path: string): Result<void> {
        const parsed = parsePath(path);

        return parsed.hasErrors ? parsed : Result.done();
    },

    select(xml: string, path: string): Result<string | null> {
        const parsed = parsePath(path);
        if (parsed.hasErrors) {
            return parsed;
        }

        const document = XmlParser.parse(xml);
        if (document.hasErrors) {
            return document;
        }

        return Result.ok(evaluate(document.value, parsed.value));
    },
};
