import { DiffKind } from "../../../Common/Diff/DiffKind";
import type { DiffNode } from "../../../Common/Diff/DiffNode";
import type { DiffSummary } from "../../../Common/Diff/DiffSummary";
import { JsonValueType } from "../../../Common/Diff/JsonValueType";
import { JsonText } from "../../../Common/Json/JsonText";
import { buildElement } from "../../Core/Dom/ElementBuilder";
import { FormControls } from "../../Core/Dom/FormControls";

const ArrayKeyPrefix = "[";
const UndefinedText = "undefined";

interface LineArguments {
    depth: number;
    kind: DiffKind;
    marker: string;
    text: string;
}

const Brackets: Record<JsonValueType, [string, string]> = {
    [JsonValueType.Primitive]: [
        "",
        "",
    ],
    [JsonValueType.Object]: [
        "{",
        "}",
    ],
    [JsonValueType.Array]: [
        "[",
        "]",
    ],
};

const DiffLineClasses: Record<DiffKind, string> = {
    [DiffKind.Unchanged]: "diff-line diff-unchanged",
    [DiffKind.Added]: "diff-line diff-added",
    [DiffKind.Removed]: "diff-line diff-removed",
    [DiffKind.Changed]: "diff-line diff-changed",
    [DiffKind.Modified]: "diff-line diff-modified",
};

function keyLabel(key: string | null): string {
    if (key === null || key.startsWith(ArrayKeyPrefix)) {
        return "";
    }

    return `"${key}": `;
}

function line(args: LineArguments): HTMLElement {
    const element = buildElement("div", {
        className: DiffLineClasses[args.kind],
        children: [
            buildElement("span", {
                className: "diff-marker",
                text: args.marker,
            }),
            buildElement("span", {
                text: args.text,
            }),
        ],
    });
    element.style.setProperty("--depth", String(args.depth));

    return element;
}

function valueLines(
    node: DiffNode,
    depth: number,
    kind: DiffKind
): HTMLElement[] {
    const marker = kind === DiffKind.Removed ? "-" : "+";
    const value = kind === DiffKind.Removed ? node.before : node.after;
    const textLines = (JsonText.stringify(value) ?? UndefinedText).split("\n");

    return textLines.map((text, index) => line({
        depth,
        kind,
        marker: kind === DiffKind.Unchanged ? " " : marker,
        text: index === 0 ? `${keyLabel(node.key)}${text}` : text,
    }));
}

function unchangedSummary(count: number, depth: number): HTMLElement {
    return line({
        depth,
        kind: DiffKind.Unchanged,
        marker: " ",
        text: `... ${count} unchanged`,
    });
}

function childLines(
    node: DiffNode,
    depth: number,
    showUnchanged: boolean
): HTMLElement[] {
    if (showUnchanged) {
        return node.children.flatMap(child => linesOf(
            child,
            depth,
            showUnchanged
        ));
    }

    const changedChildren = node.children.filter(child => child.kind !== DiffKind.Unchanged);
    const unchangedCount = node.children.length - changedChildren.length;
    const lines = changedChildren.flatMap(child => linesOf(
        child,
        depth,
        showUnchanged
    ));

    if (unchangedCount === 0) {
        return lines;
    }

    return [
        ...lines,
        unchangedSummary(unchangedCount, depth),
    ];
}

function isExpandable(node: DiffNode): boolean {
    const isComparedOnBothSides = node.kind === DiffKind.Unchanged || node.kind === DiffKind.Modified;

    return isComparedOnBothSides && node.valueType !== JsonValueType.Primitive;
}

function linesOf(
    node: DiffNode,
    depth: number,
    showUnchanged: boolean
): HTMLElement[] {
    if (isExpandable(node)) {
        return containerLines(
            node,
            depth,
            showUnchanged
        );
    }

    if (node.kind === DiffKind.Changed) {
        return [
            ...valueLines(
                node,
                depth,
                DiffKind.Removed
            ),
            ...valueLines(
                node,
                depth,
                DiffKind.Added
            ),
        ];
    }

    return valueLines(
        node,
        depth,
        node.kind
    );
}

function containerLines(
    node: DiffNode,
    depth: number,
    showUnchanged: boolean
): HTMLElement[] {
    const [open, close] = Brackets[node.valueType];

    return [
        line({
            depth,
            kind: node.kind,
            marker: " ",
            text: `${keyLabel(node.key)}${open}`,
        }),
        ...childLines(
            node,
            depth + 1,
            showUnchanged
        ),
        line({
            depth,
            kind: node.kind,
            marker: " ",
            text: close,
        }),
    ];
}

function summaryChips(summary: DiffSummary): HTMLElement {
    return buildElement("div", {
        className: "diff-summary",
        children: [
            buildElement("span", {
                className: "diff-chip diff-added",
                text: `+${summary.added} added`,
            }),
            buildElement("span", {
                className: "diff-chip diff-removed",
                text: `-${summary.removed} removed`,
            }),
            buildElement("span", {
                className: "diff-chip diff-changed",
                text: `~${summary.changed} changed`,
            }),
        ],
    });
}

export const JsonDiffView = {
    build(root: DiffNode, summary: DiffSummary): HTMLElement {
        const lines = buildElement("div", {
            className: "diff-lines code-block",
        });
        const render = (showUnchanged: boolean): void => lines.replaceChildren(...linesOf(
            root,
            0,
            showUnchanged
        ));
        render(false);

        return buildElement("div", {
            className: "diff-view",
            children: [
                buildElement("div", {
                    className: "diff-toolbar",
                    children: [
                        summaryChips(summary),
                        FormControls.checkbox({
                            checked: false,
                            label: "Show unchanged",
                            onChange: render,
                        }),
                    ],
                }),
                lines,
            ],
        });
    },
};
