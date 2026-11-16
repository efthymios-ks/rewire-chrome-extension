import { buildElement } from '../../Core/Dom/buildElement';

const OPEN_DEPTH = 2;
const MAX_CHILDREN = 500;

type JsonContainer = Record<string, unknown> | unknown[];

function isContainer(value: unknown): value is JsonContainer {
    return typeof value === 'object' && value != null;
}

function valueClassOf(value: unknown): string {
    if (value === null) {
        return 'json-null';
    }

    return `json-${typeof value}`;
}

function primitiveText(value: unknown): string {
    return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function previewOf(value: JsonContainer): string {
    if (Array.isArray(value)) {
        return `[${value.length}]`;
    }

    return `{${Object.keys(value).length}}`;
}

function keyLabel(key: string | null): HTMLElement | null {
    return key == null
        ? null
        : buildElement('span', {
            className: 'json-key',
            text: `${key}: `,
        });
}

interface NodeOfOptions {
    key: string | null;
    value: unknown;
    depth: number;
}

function nodeOf({ key, value, depth }: NodeOfOptions): HTMLElement {
    if (!isContainer(value)) {
        return buildElement('div', {
            className: 'json-leaf',
            children: [
                keyLabel(key),
                buildElement('span', {
                    className: valueClassOf(value),
                    text: primitiveText(value),
                }),
            ],
        });
    }

    const entries = Object
        .entries(value)
        .slice(0, MAX_CHILDREN);
    const hidden = Object.keys(value).length - entries.length;
    const details = buildElement('details', {
        className: 'json-node',
        children: [
            buildElement('summary', {
                children: [
                    keyLabel(key),
                    buildElement('span', {
                        className: 'json-preview',
                        text: previewOf(value),
                    }),
                ],
            }),
            ...entries.map(([childKey, childValue]) => nodeOf({
                key: childKey,
                value: childValue,
                depth: depth + 1,
            })),
            hidden > 0
                ? buildElement('div', {
                    className: 'json-overflow',
                    text: `${hidden} more not shown`,
                })
                : null,
        ],
    });
    details.open = depth < OPEN_DEPTH;

    return details;
}

export const JsonTreeView = {
    build(value: unknown, shouldWrap: boolean): HTMLElement {
        return buildElement('div', {
            className: 'json-tree',
            attributes: shouldWrap ? { 'data-wrap': '' } : {},
            children: [
                nodeOf({ key: null, value, depth: 0 }),
            ],
        });
    },
};
