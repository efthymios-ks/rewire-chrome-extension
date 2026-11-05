import { buildElement } from "../../Core/Dom/ElementBuilder";

const OpenDepth = 2;
const MaxChildren = 500;

type JsonContainer = Record<string, unknown> | unknown[];

function isContainer(value: unknown): value is JsonContainer {
    return typeof value === "object" && value !== null;
}

function valueClassOf(value: unknown): string {
    if (value === null) {
        return "json-null";
    }

    return `json-${typeof value}`;
}

function primitiveText(value: unknown): string {
    return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function previewOf(value: JsonContainer): string {
    if (Array.isArray(value)) {
        return `[${value.length}]`;
    }

    return `{${Object.keys(value).length}}`;
}

function keyLabel(key: string | null): HTMLElement | null {
    return key === null
        ? null
        : buildElement("span", {
            className: "json-key",
            text: `${key}: `,
        });
}

function nodeOf(
    key: string | null,
    value: unknown,
    depth: number
): HTMLElement {
    if (!isContainer(value)) {
        return buildElement("div", {
            className: "json-leaf",
            children: [
                keyLabel(key),
                buildElement("span", {
                    className: valueClassOf(value),
                    text: primitiveText(value),
                }),
            ],
        });
    }

    const entries = Object
        .entries(value)
        .slice(0, MaxChildren);
    const hidden = Object.keys(value).length - entries.length;
    const details = buildElement("details", {
        className: "json-node",
        children: [
            buildElement("summary", {
                children: [
                    keyLabel(key),
                    buildElement("span", {
                        className: "json-preview",
                        text: previewOf(value),
                    }),
                ],
            }),
            ...entries.map(([childKey, childValue]) => nodeOf(
                childKey,
                childValue,
                depth + 1
            )),
            hidden > 0
                ? buildElement("div", {
                    className: "muted",
                    text: `${hidden} more not shown`,
                })
                : null,
        ],
    });
    details.open = depth < OpenDepth;

    return details;
}

export const JsonTreeView = {
    build(value: unknown, wrap: boolean): HTMLElement {
        return buildElement("div", {
            className: wrap ? "json-tree wrap" : "json-tree",
            children: [
                nodeOf(
                    null,
                    value,
                    0
                ),
            ],
        });
    },
};
