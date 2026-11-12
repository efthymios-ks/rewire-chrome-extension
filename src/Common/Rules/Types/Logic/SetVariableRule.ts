import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import { JsonText } from "../../../Json/JsonText";
import { JsonPath } from "../../../Paths/JsonPath";
import { XPath } from "../../../Paths/XPath";
import type { Result } from "../../../Results/Result";
import { SafeUrl } from "../../../Urls/SafeUrl";
import type { RuleContext } from "../../Context/RuleContext";
import { RegexCache } from "../../Criteria/RegexCache";
import type { RequestDraft, ResponseDraft } from "../../Drafts/Drafts";
import { VariableNames } from "../../Templates/VariableNames";
import { CookieHeader } from "../../Http/CookieHeader";
import { HeaderList } from "../../Http/HeaderList";
import { ActionReader } from "../ActionReader";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { RuleChecks } from "../RuleChecks";
import { type ResponseArguments, RuleTypeBase } from "../RuleTypeBase";

export const VariableSources = {
    Url: "url",
    Query: "query",
    RequestHeader: "requestHeader",
    RequestCookie: "requestCookie",
    ResponseHeader: "responseHeader",
    RequestBodyJson: "requestBodyJson",
    ResponseBodyJson: "responseBodyJson",
    RequestBodyXml: "requestBodyXml",
    ResponseBodyXml: "responseBodyXml",
} as const;

const ResponseSources: string[] = [
    VariableSources.ResponseHeader,
    VariableSources.ResponseBodyJson,
    VariableSources.ResponseBodyXml,
];

const KeyedSources: string[] = [
    VariableSources.Query,
    VariableSources.RequestHeader,
    VariableSources.RequestCookie,
    VariableSources.ResponseHeader,
];

type PathValidator = (path: string) => Result<void>;

const PathValidators: Record<string, PathValidator> = {
    [VariableSources.RequestBodyJson]: JsonPath.validate,
    [VariableSources.ResponseBodyJson]: JsonPath.validate,
    [VariableSources.RequestBodyXml]: XPath.validate,
    [VariableSources.ResponseBodyXml]: XPath.validate,
};

const PathLabel = "Path";

function isPathBodySource(source: string): boolean {
    return PathValidators[source] !== undefined;
}

interface SetVariableAction {
    variable: string;
    source: string;
    key: string;
    pattern: string;
    path: string;
}

type Reader = (body: string | null, path: string) => string | null;

function sourceOf(action: RuleAction): string {
    return ActionReader.text(
        action,
        "source",
        VariableSources.Url
    );
}

function readJson(body: string | null, path: string): string | null {
    if (body === null || body === "" || path.trim() === "") {
        return null;
    }

    const parsed = JsonText.tryParse(body);
    if (parsed.hasErrors) {
        return null;
    }

    const selected = JsonPath.select(parsed.value, path);
    if (selected.hasErrors || selected.value === undefined || selected.value === null) {
        return null;
    }

    return typeof selected.value === "string" ? selected.value : JsonText.stringify(selected.value);
}

function readXml(body: string | null, path: string): string | null {
    if (body === null || body === "" || path.trim() === "") {
        return null;
    }

    const selected = XPath.select(body, path);

    return selected.hasErrors ? null : selected.value;
}

const RequestBodyReaders: Record<string, Reader> = {
    [VariableSources.RequestBodyJson]: readJson,
    [VariableSources.RequestBodyXml]: readXml,
};

const ResponseBodyReaders: Record<string, Reader> = {
    [VariableSources.ResponseBodyJson]: readJson,
    [VariableSources.ResponseBodyXml]: readXml,
};

type RequestReader = (draft: RequestDraft, key: string) => string | null;

const RequestReaders: Record<string, RequestReader> = {
    [VariableSources.Url]: draft => draft.url,
    [VariableSources.Query]: (draft, key) => SafeUrl.parse(draft.url)?.searchParams.get(key) ?? null,
    [VariableSources.RequestHeader]: (draft, key) => HeaderList.first(draft.headers, key),
    [VariableSources.RequestCookie]: (draft, key) => CookieHeader.valuesOf(HeaderList.first(draft.headers, "Cookie"), key)[0] ?? null,
};

function extractWithRegex(text: string | null, pattern: string): string | null {
    if (text === null || pattern.trim() === "") {
        return text;
    }

    const compiled = RegexCache.compile(pattern);
    if (compiled.hasErrors) {
        return null;
    }

    const match = compiled.value.exec(text);

    return match === null ? null : match[1] ?? match[0];
}

export class SetVariableRule extends RuleTypeBase<SetVariableAction> {
    readonly id = RuleTypeIds.SetVariable;
    readonly category = RuleCategory.Logic;
    readonly label = "Set variable";
    readonly description = "Capture a value from the URL, a header, a cookie or the body, and use it as {{name}} in other rules.";
    override readonly handlesRequest = true;
    override readonly handlesResponse = true;
    override readonly needsResponseBody = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Text,
            key: "variable",
            label: "Variable name",
            placeholder: "userId",
        },
        {
            kind: FieldKind.Select,
            key: "source",
            label: "From",
            options: [
                {
                    value: VariableSources.Url,
                    label: "URL",
                },
                {
                    value: VariableSources.Query,
                    label: "Query parameter",
                },
                {
                    value: VariableSources.RequestHeader,
                    label: "Request header",
                },
                {
                    value: VariableSources.RequestCookie,
                    label: "Request cookie",
                },
                {
                    value: VariableSources.ResponseHeader,
                    label: "Response header",
                },
                {
                    value: VariableSources.RequestBodyJson,
                    label: "Request body (JSONPath)",
                },
                {
                    value: VariableSources.ResponseBodyJson,
                    label: "Response body (JSONPath)",
                },
                {
                    value: VariableSources.RequestBodyXml,
                    label: "Request body (XPath)",
                },
                {
                    value: VariableSources.ResponseBodyXml,
                    label: "Response body (XPath)",
                },
            ],
        },
        {
            kind: FieldKind.Text,
            key: "key",
            label: "Name",
            placeholder: "Name",
            visibleWhen: action => KeyedSources.includes(sourceOf(action)),
        },
        {
            kind: FieldKind.Text,
            key: "path",
            label: PathLabel,
            placeholder: "$.items[0].id",
            hint: "JSONPath for JSON sources ($.a.b[0], $.items[-1].sku, $.user['first-name']). XPath for XML (/root/elem[1]/@attr, //note/text(), /root/items[@kind='primary']).",
            visibleWhen: action => isPathBodySource(sourceOf(action)),
        },
        {
            kind: FieldKind.Text,
            key: "pattern",
            label: "Regex (optional)",
            placeholder: "/users/(\\d+)",
            hint: "The first group, or the whole match, becomes the value.",
            visibleWhen: action => !isPathBodySource(sourceOf(action)),
        },
    ];

    protected defaults(): SetVariableAction {
        return {
            variable: "",
            source: VariableSources.Url,
            key: "",
            pattern: "",
            path: "",
        };
    }

    protected read(action: RuleAction): SetVariableAction {
        return {
            variable: ActionReader.text(action, "variable").trim(),
            source: sourceOf(action),
            key: ActionReader.text(action, "key").trim(),
            pattern: ActionReader.text(action, "pattern"),
            path: ActionReader.text(action, "path").trim(),
        };
    }

    protected describe(action: SetVariableAction): string {
        const detail = KeyedSources.includes(action.source) ? ` ${action.key}` : "";
        const pathBit = isPathBodySource(action.source) ? ` ${action.path}` : "";

        return `{{${action.variable}}} <- ${action.source}${detail}${pathBit}`;
    }

    protected override check(action: SetVariableAction): string[] {
        return [
            ...(VariableNames.isValid(action.variable) ? [] : [VariableNames.Rule]),
            ...(KeyedSources.includes(action.source) ? RuleChecks.required(action.key, "Name") : []),
            ...this.pathErrors(action),
            ...(action.pattern.trim() === "" || isPathBodySource(action.source) ? [] : RuleChecks.regex(action.pattern, "Regex")),
        ];
    }

    protected override onRequest(
        draft: RequestDraft,
        action: SetVariableAction,
        context: RuleContext
    ): RequestDraft {
        if (ResponseSources.includes(action.source)) {
            return draft;
        }

        const reader = RequestReaders[action.source];
        if (reader !== undefined) {
            this.store(
                extractWithRegex(reader(draft, action.key), action.pattern),
                action,
                context
            );

            return draft;
        }

        const bodyReader = RequestBodyReaders[action.source];
        if (bodyReader !== undefined) {
            this.store(
                bodyReader(draft.body, action.path),
                action,
                context
            );
        }

        return draft;
    }

    protected override onResponse(args: ResponseArguments<SetVariableAction>): ResponseDraft {
        if (args.action.source === VariableSources.ResponseHeader) {
            this.store(
                extractWithRegex(HeaderList.first(args.draft.headers, args.action.key), args.action.pattern),
                args.action,
                args.context
            );

            return args.draft;
        }

        const bodyReader = ResponseBodyReaders[args.action.source];
        if (bodyReader !== undefined) {
            this.store(
                bodyReader(args.draft.body, args.action.path),
                args.action,
                args.context
            );
        }

        return args.draft;
    }

    private pathErrors(action: SetVariableAction): string[] {
        const validate = PathValidators[action.source];
        if (validate === undefined) {
            return [];
        }

        const required = RuleChecks.required(action.path, PathLabel);
        if (required.length > 0) {
            return required;
        }

        const parsed = validate(action.path);

        return parsed.hasErrors ? [`${PathLabel} is invalid: ${parsed.error}`] : [];
    }

    private store(
        value: string | null,
        action: SetVariableAction,
        context: RuleContext
    ): void {
        if (value === null) {
            return;
        }

        context.setVariable(action.variable, value);
    }
}
