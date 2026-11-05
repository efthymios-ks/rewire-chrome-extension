import { HeaderNames } from "../../../../Contracts/Http/HeaderNames";
import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import type { HeaderEntry } from "../../../../Contracts/Timeline/HeaderEntry";
import { JsonText } from "../../../Json/JsonText";
import type { RuleContext } from "../../Context/RuleContext";
import { HeaderList } from "../../Http/HeaderList";
import { ActionReader } from "../ActionReader";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { JsonMergePatch } from "../JsonMergePatch";
import { RuleChecks } from "../RuleChecks";
import { TextReplace } from "../TextReplace";

export const BodyEditModes = {
    Replace: "replace",
    JsonMerge: "jsonMerge",
    FindReplace: "findReplace",
} as const;

export const FindKinds = {
    Text: "text",
    Regex: "regex",
} as const;

export const BodyEditMessages = {
    InvalidPatch: "The JSON patch is not valid JSON.",
} as const;

export interface BodyEdit {
    mode: string;
    body: string;
    contentType: string;
    find: string;
    findAs: string;
    replace: string;
}

type BodyEditor = (
    body: string,
    edit: BodyEdit,
    context: RuleContext
) => string;

const BodyEditors: Record<string, BodyEditor> = {
    [BodyEditModes.Replace]: (
        _body,
        edit,
        context
    ) => context.render(edit.body),
    [BodyEditModes.JsonMerge]: (
        body,
        edit,
        context
    ) => {
        const target = JsonText.tryParse(body);
        const patch = JsonText.tryParse(context.render(edit.body));
        if (target.hasErrors || patch.hasErrors) {
            return body;
        }

        return JSON.stringify(JsonMergePatch.apply(target.value, patch.value));
    },
    [BodyEditModes.FindReplace]: (
        body,
        edit,
        context
    ) => TextReplace.apply(body, {
        find: edit.find,
        replace: context.render(edit.replace),
        isRegex: edit.findAs === FindKinds.Regex,
    }),
};

function modeOf(action: RuleAction): string {
    const mode = ActionReader.text(action, "mode");
    if (mode !== "") {
        return mode;
    }

    return ActionReader.text(action, "find") === "" ? BodyEditModes.Replace : BodyEditModes.FindReplace;
}

function findKindOf(action: RuleAction): string {
    const findAs = ActionReader.text(action, "findAs");
    if (findAs !== "") {
        return findAs;
    }

    const isRegex = ActionReader.bool(
        action,
        "isRegex",
        false
    );

    return isRegex ? FindKinds.Regex : FindKinds.Text;
}

function isMode(...modes: string[]): (action: RuleAction) => boolean {
    return action => modes.includes(modeOf(action));
}

export const BodyEdits = {
    fields(): FieldSpec[] {
        return [
            {
                kind: FieldKind.Select,
                key: "mode",
                label: "Mode",
                options: [
                    {
                        value: BodyEditModes.Replace,
                        label: "Replace the body",
                    },
                    {
                        value: BodyEditModes.JsonMerge,
                        label: "Merge a JSON patch (null removes a key)",
                    },
                    {
                        value: BodyEditModes.FindReplace,
                        label: "Find and replace",
                    },
                ],
            },
            {
                kind: FieldKind.Code,
                key: "body",
                label: "Body or JSON patch",
                rows: 8,
                hint: "Can use {{variables}}.",
                visibleWhen: isMode(BodyEditModes.Replace, BodyEditModes.JsonMerge),
            },
            {
                kind: FieldKind.MediaType,
                key: "contentType",
                label: "Content type",
                hint: "Empty keeps the one there.",
                visibleWhen: isMode(BodyEditModes.Replace),
            },
            {
                kind: FieldKind.Text,
                key: "find",
                label: "Find",
                visibleWhen: isMode(BodyEditModes.FindReplace),
            },
            {
                kind: FieldKind.Select,
                key: "findAs",
                label: "Find as",
                options: [
                    {
                        value: FindKinds.Text,
                        label: "Text",
                    },
                    {
                        value: FindKinds.Regex,
                        label: "Regex",
                    },
                ],
                visibleWhen: isMode(BodyEditModes.FindReplace),
            },
            {
                kind: FieldKind.Text,
                key: "replace",
                label: "Replace with",
                hint: "With Regex, $1 inserts a group. Can use {{variables}}.",
                visibleWhen: isMode(BodyEditModes.FindReplace),
            },
        ];
    },

    defaults(): BodyEdit {
        return {
            mode: BodyEditModes.Replace,
            body: "",
            contentType: "",
            find: "",
            findAs: FindKinds.Text,
            replace: "",
        };
    },

    read(action: RuleAction): BodyEdit {
        return {
            mode: modeOf(action),
            body: ActionReader.text(action, "body"),
            contentType: ActionReader.text(action, "contentType").trim(),
            find: ActionReader.text(action, "find"),
            findAs: findKindOf(action),
            replace: ActionReader.text(action, "replace"),
        };
    },

    check(edit: BodyEdit): string[] {
        if (edit.mode === BodyEditModes.FindReplace) {
            return [
                ...RuleChecks.required(edit.find, "Find"),
                ...(edit.findAs === FindKinds.Regex ? RuleChecks.regex(edit.find, "Find") : []),
            ];
        }

        if (edit.mode === BodyEditModes.JsonMerge && JsonText.tryParse(edit.body).hasErrors) {
            return [BodyEditMessages.InvalidPatch];
        }

        return [];
    },

    describe(edit: BodyEdit): string {
        return edit.mode === BodyEditModes.FindReplace ? `${edit.find} -> ${edit.replace}` : edit.mode;
    },

    bodyOf(
        body: string | null,
        edit: BodyEdit,
        context: RuleContext
    ): string | null {
        if (body === null && edit.mode !== BodyEditModes.Replace) {
            return body;
        }

        const editor = BodyEditors[edit.mode] ?? BodyEditors[BodyEditModes.Replace]!;

        return editor(
            body ?? "",
            edit,
            context
        );
    },

    headersOf(headers: HeaderEntry[], edit: BodyEdit): HeaderEntry[] {
        if (edit.mode !== BodyEditModes.Replace || edit.contentType === "") {
            return headers;
        }

        return HeaderList.set(
            headers,
            HeaderNames.ContentType,
            edit.contentType
        );
    },
};
