import { HeaderNames } from "../../../../Contracts/Http/HeaderNames";
import { MediaTypeNames } from "../../../../Contracts/Http/MediaTypeNames";
import { StatusCodeLimits } from "../../../../Contracts/Http/StatusCodePresets";
import type { RuleCriteria } from "../../../../Contracts/Rules/Criterion";
import type { RuleAction } from "../../../../Contracts/Rules/Rule";
import { RuleCategory } from "../../../../Contracts/Rules/RuleCategory";
import { RuleTypeIds } from "../../../../Contracts/Rules/RuleTypeIds";
import type { HeaderEntry } from "../../../../Contracts/Timeline/HeaderEntry";
import { HeaderSuggestions } from "../../../Http/HeaderSuggestions";
import type { RuleContext } from "../../Context/RuleContext";
import { CriteriaEvaluator } from "../../Criteria/CriteriaEvaluator";
import { CriterionStage } from "../../Criteria/CriterionStage";
import type { RequestDraft, ResponseDraft } from "../../Drafts/Drafts";
import { HeaderList } from "../../Http/HeaderList";
import { ActionReader } from "../ActionReader";
import { FieldKind, type FieldSpec } from "../FieldSpec";
import { CorsHeaders } from "../Headers/CorsHeaders";
import { RuleChecks } from "../RuleChecks";
import { type ResponseArguments, RuleTypeBase } from "../RuleTypeBase";

interface KeyValue {
    key: string;
    value: string;
}

interface MockResponseAction {
    overrideStatus: boolean;
    status: number;
    overrideBody: boolean;
    contentType: string;
    headers: KeyValue[];
    body: string;
}

const MockResponseKeys = {
    OverrideStatus: "overrideStatus",
    OverrideBody: "overrideBody",
} as const;

export const MockMessages = {
    NothingToOverride: "Pick the status, the body or both.",
} as const;

function keyValues(action: RuleAction, key: string): KeyValue[] {
    return ActionReader.records(
        action,
        key,
        item => ({
            key: ActionReader.field(item, "key").trim(),
            value: ActionReader.field(item, "value"),
        })
    );
}

function isOn(key: string): (action: RuleAction) => boolean {
    return action => action[key] !== false;
}

function isFullMock(action: MockResponseAction): boolean {
    return action.overrideStatus && action.overrideBody;
}

function withHeaders(
    headers: HeaderEntry[],
    additions: HeaderEntry[]
): HeaderEntry[] {
    return additions.reduce(
        (current, header) => HeaderList.set(
            current,
            header.name,
            header.value
        ),
        headers
    );
}

function customHeaders(action: MockResponseAction, context: RuleContext): HeaderEntry[] {
    return action.headers.map(header => ({
        name: header.key,
        value: context.render(header.value),
    }));
}

function contentTypeHeaders(contentType: string): HeaderEntry[] {
    return contentType.trim() === ""
        ? []
        : [
            {
                name: HeaderNames.ContentType,
                value: contentType.trim(),
            },
        ];
}

export class MockResponseRule extends RuleTypeBase<MockResponseAction> {
    readonly id = RuleTypeIds.MockResponse;
    readonly category = RuleCategory.MocksAndResponses;
    readonly label = "Mock response";
    readonly description = "Answer with your own status, body or both. With both, the server is never called.";
    override readonly handlesRequest = true;
    override readonly handlesResponse = true;
    override readonly needsResponseBody = true;
    readonly fields: FieldSpec[] = [
        {
            kind: FieldKind.Checkbox,
            key: MockResponseKeys.OverrideStatus,
            label: "Override the status",
        },
        {
            kind: FieldKind.Status,
            key: "status",
            label: "Status",
            visibleWhen: isOn(MockResponseKeys.OverrideStatus),
        },
        {
            kind: FieldKind.Checkbox,
            key: MockResponseKeys.OverrideBody,
            label: "Override the body",
        },
        {
            kind: FieldKind.MediaType,
            key: "contentType",
            label: "Content type",
            placeholder: MediaTypeNames.ApplicationJson,
            visibleWhen: isOn(MockResponseKeys.OverrideBody),
        },
        {
            kind: FieldKind.Code,
            key: "body",
            label: "Body",
            rows: 12,
            hint: "Can use {{variables}}.",
            visibleWhen: isOn(MockResponseKeys.OverrideBody),
        },
        {
            kind: FieldKind.KeyValueList,
            key: "headers",
            label: "Headers",
            nameSuggestions: HeaderSuggestions.names(),
            valueSuggestionsFor: HeaderSuggestions.valuesFor,
        },
    ];

    override runsAtRequest(action: RuleAction): boolean {
        return isFullMock(this.read(action));
    }

    override runsAtResponse(action: RuleAction, criteria: RuleCriteria): boolean {
        return !isFullMock(this.read(action)) || CriteriaEvaluator.hasStage(criteria, CriterionStage.Response);
    }

    protected defaults(): MockResponseAction {
        return {
            overrideStatus: true,
            status: StatusCodeLimits.DefaultMock,
            overrideBody: true,
            contentType: MediaTypeNames.ApplicationJson,
            headers: [],
            body: "{}",
        };
    }

    protected read(action: RuleAction): MockResponseAction {
        return {
            overrideStatus: ActionReader.bool(
                action,
                MockResponseKeys.OverrideStatus,
                true
            ),
            status: ActionReader.number(
                action,
                "status",
                StatusCodeLimits.DefaultMock
            ),
            overrideBody: ActionReader.bool(
                action,
                MockResponseKeys.OverrideBody,
                true
            ),
            contentType: ActionReader.text(
                action,
                "contentType",
                MediaTypeNames.ApplicationJson
            ),
            headers: keyValues(action, "headers"),
            body: ActionReader.text(action, "body"),
        };
    }

    protected describe(action: MockResponseAction): string {
        const parts = [
            action.overrideStatus ? String(action.status) : null,
            action.overrideBody ? action.contentType || "body" : null,
        ];

        return parts
            .filter((part): part is string => part !== null)
            .join(" ");
    }

    protected override check(action: MockResponseAction): string[] {
        return [
            ...(action.overrideStatus || action.overrideBody ? [] : [MockMessages.NothingToOverride]),
            ...(action.overrideStatus ? RuleChecks.status(action.status) : []),
            ...action.headers.flatMap(header => RuleChecks.headerName(header.key)),
        ];
    }

    protected override onRequest(
        draft: RequestDraft,
        action: MockResponseAction,
        context: RuleContext
    ): RequestDraft {
        if (!isFullMock(action)) {
            return draft;
        }

        if (CorsHeaders.isPreflight(draft)) {
            return {
                ...draft,
                response: {
                    status: StatusCodeLimits.NoContent,
                    headers: CorsHeaders.forPreflight(draft, null),
                    body: "",
                },
            };
        }

        return {
            ...draft,
            response: {
                status: action.status,
                headers: [
                    ...contentTypeHeaders(action.contentType),
                    ...customHeaders(action, context),
                    ...CorsHeaders.echo(HeaderList.first(draft.headers, HeaderNames.Origin)),
                ],
                body: context.render(action.body),
            },
        };
    }

    protected override onResponse(args: ResponseArguments<MockResponseAction>): ResponseDraft {
        const { draft, action, context } = args;
        if (draft.errorReason !== null) {
            return draft;
        }

        const bodyHeaders = action.overrideBody ? contentTypeHeaders(action.contentType) : [];

        return {
            ...draft,
            status: action.overrideStatus ? Math.max(action.status, StatusCodeLimits.Min) : draft.status,
            headers: withHeaders(draft.headers, [
                ...bodyHeaders,
                ...customHeaders(action, context),
            ]),
            body: action.overrideBody ? context.render(action.body) : draft.body,
        };
    }
}
