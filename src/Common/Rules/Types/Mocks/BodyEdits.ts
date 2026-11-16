import { HEADER_NAMES } from '../../../../Contracts/Http/HeaderNames';
import type { RuleAction } from '../../../../Contracts/Rules/RuleAction';
import type { HeaderEntry } from '../../../../Contracts/Timeline/HeaderEntry';
import { JsonText } from '../../../Json/JsonText';
import type { RuleContext } from '../../Context/RuleContext';
import { HeaderList } from '../../Http/HeaderList';
import { ActionReader } from '../ActionReader';
import { FIELD_KIND } from '../FieldKind';
import type { FieldSpec } from '../FieldSpec';
import { JsonMergePatch } from '../JsonMergePatch';
import { RuleChecks } from '../RuleChecks';
import { TextReplace } from '../TextReplace';
import { BODY_EDIT_MESSAGES } from './BodyEditMessages';
import { BODY_EDIT_MODES } from './BodyEditModes';
import { FIND_KINDS } from './FindKinds';

export interface BodyEdit {
    mode: string;
    body: string;
    contentType: string;
    find: string;
    findAs: string;
    replace: string;
}

interface BodyEditorOptions {
    body: string;
    edit: BodyEdit;
    context: RuleContext;
}

type BodyEditor = (options: BodyEditorOptions) => string;

const BODY_EDITORS: Record<string, BodyEditor> = {
    [BODY_EDIT_MODES.Replace]: ({ edit, context }) => context.render(edit.body),
    [BODY_EDIT_MODES.JsonMerge]: ({ body, edit, context }) => {
        const target = JsonText.tryParse(body);
        const patch = JsonText.tryParse(context.render(edit.body));
        if (target.hasErrors || patch.hasErrors) {
            return body;
        }

        return JSON.stringify(JsonMergePatch.apply(target.value, patch.value));
    },
    [BODY_EDIT_MODES.FindReplace]: ({ body, edit, context }) => TextReplace.apply(body, {
        find: edit.find,
        replace: context.render(edit.replace),
        isRegex: edit.findAs === FIND_KINDS.Regex,
    }),
};

function modeOf(action: RuleAction): string {
    const mode = ActionReader.text({ raw: action, key: 'mode' });
    if (mode !== '') {
        return mode;
    }

    return ActionReader.text({
        raw: action,
        key: 'find',
    }) === '' ? BODY_EDIT_MODES.Replace : BODY_EDIT_MODES.FindReplace;
}

function findKindOf(action: RuleAction): string {
    const findAs = ActionReader.text({ raw: action, key: 'findAs' });
    if (findAs !== '') {
        return findAs;
    }

    const isRegex = ActionReader.bool({ raw: action, key: 'isRegex', fallback: false });

    return isRegex ? FIND_KINDS.Regex : FIND_KINDS.Text;
}

function isMode(...modes: string[]): (action: RuleAction) => boolean {
    return action => modes.includes(modeOf(action));
}

export interface BodyOfOptions {
    body: string | null;
    edit: BodyEdit;
    context: RuleContext;
}

export const BodyEdits = {
    fields(): FieldSpec[] {
        return [
            {
                kind: FIELD_KIND.Select,
                key: 'mode',
                label: 'Mode',
                options: [
                    {
                        value: BODY_EDIT_MODES.Replace,
                        label: 'Replace the body',
                    },
                    {
                        value: BODY_EDIT_MODES.JsonMerge,
                        label: 'Merge a JSON patch (null removes a key)',
                    },
                    {
                        value: BODY_EDIT_MODES.FindReplace,
                        label: 'Find and replace',
                    },
                ],
            },
            {
                kind: FIELD_KIND.Code,
                key: 'body',
                label: 'Body or JSON patch',
                rows: 8,
                hint: 'Can use {{variables}}.',
                visibleWhen: isMode(BODY_EDIT_MODES.Replace, BODY_EDIT_MODES.JsonMerge),
            },
            {
                kind: FIELD_KIND.MediaType,
                key: 'contentType',
                label: 'Content type',
                hint: 'Empty keeps the one there.',
                visibleWhen: isMode(BODY_EDIT_MODES.Replace),
            },
            {
                kind: FIELD_KIND.Text,
                key: 'find',
                label: 'Find',
                visibleWhen: isMode(BODY_EDIT_MODES.FindReplace),
            },
            {
                kind: FIELD_KIND.Select,
                key: 'findAs',
                label: 'Find as',
                options: [
                    {
                        value: FIND_KINDS.Text,
                        label: 'Text',
                    },
                    {
                        value: FIND_KINDS.Regex,
                        label: 'Regex',
                    },
                ],
                visibleWhen: isMode(BODY_EDIT_MODES.FindReplace),
            },
            {
                kind: FIELD_KIND.Text,
                key: 'replace',
                label: 'Replace with',
                hint: 'With Regex, $1 inserts a group. Can use {{variables}}.',
                visibleWhen: isMode(BODY_EDIT_MODES.FindReplace),
            },
        ];
    },

    defaults(): BodyEdit {
        return {
            mode: BODY_EDIT_MODES.Replace,
            body: '',
            contentType: '',
            find: '',
            findAs: FIND_KINDS.Text,
            replace: '',
        };
    },

    read(action: RuleAction): BodyEdit {
        return {
            mode: modeOf(action),
            body: ActionReader.text({ raw: action, key: 'body' }),
            contentType: ActionReader.text({ raw: action, key: 'contentType' }).trim(),
            find: ActionReader.text({ raw: action, key: 'find' }),
            findAs: findKindOf(action),
            replace: ActionReader.text({ raw: action, key: 'replace' }),
        };
    },

    check(edit: BodyEdit): string[] {
        if (edit.mode === BODY_EDIT_MODES.FindReplace) {
            return [
                ...RuleChecks.required(edit.find, 'Find'),
                ...(edit.findAs === FIND_KINDS.Regex ? RuleChecks.regex(edit.find, 'Find') : []),
            ];
        }

        if (edit.mode === BODY_EDIT_MODES.JsonMerge && JsonText.tryParse(edit.body).hasErrors) {
            return [BODY_EDIT_MESSAGES.InvalidPatch];
        }

        return [];
    },

    describe(edit: BodyEdit): string {
        return edit.mode === BODY_EDIT_MODES.FindReplace ? `${edit.find} -> ${edit.replace}` : edit.mode;
    },

    bodyOf({ body, edit, context }: BodyOfOptions): string | null {
        if (body == null && edit.mode !== BODY_EDIT_MODES.Replace) {
            return body;
        }

        const mode = Object.hasOwn(BODY_EDITORS, edit.mode) ? edit.mode : BODY_EDIT_MODES.Replace;
        const editor = BODY_EDITORS[mode]!;

        return editor({ body: body ?? '', edit, context });
    },

    headersOf(headers: HeaderEntry[], edit: BodyEdit): HeaderEntry[] {
        if (edit.mode !== BODY_EDIT_MODES.Replace || edit.contentType === '') {
            return headers;
        }

        return HeaderList.set({ headers, name: HEADER_NAMES.ContentType, value: edit.contentType });
    },
};
